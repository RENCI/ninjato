import os
from datetime import datetime
from girder.models.item import Item
from girder.models.file import File
from girder.models.user import User
from bson.objectid import ObjectId
from girder.models.collection import Collection
from girder.models.folder import Folder
from girder.exceptions import RestException
from .constants import COLLECTION_NAME, DATA_PATH
from .utils import get_max_region_id, set_max_region_id, remove_region_from_active_assignment, \
    merge_region_to_active_assignment, set_assignment_meta, get_history_info, \
    assign_region_to_user, save_file, add_meta_to_history, check_subvolume_done, \
    reject_assignment, update_assignment_in_whole_item, get_assignment_status, remove_regions, \
    find_region_item_from_label, get_region_extent, save_content_bytes_to_tiff, \
    update_all_assignment_masks_async


def get_available_region_ids(whole_item, count=1):
    """
    return max region id followed by increasing max region id by delta in an atomic operation
    :param whole_item: whole item to get available region ids
    :param count: number of available ids to get
    :return: available count number of region ids
    """
    max_id = get_max_region_id(whole_item)
    if 'removed_region_ids' in whole_item['meta'] and whole_item['meta']['removed_region_ids']:
        id_list = whole_item['meta']['removed_region_ids']
        id_list_cnt = len(id_list)
        if id_list_cnt == count:
            whole_item['meta']['removed_region_ids'] = []
            Item().save(whole_item)
            return id_list
        if id_list_cnt > count:
            whole_item['meta']['removed_region_ids'] = id_list_cnt[count:]
            Item().save(whole_item)
            return id_list[:count]
        # id_list_cnt < count, so append more available ids
        whole_item['meta']['removed_region_ids'] = []
        Item().save(whole_item)
        id_list.extend([max_id + 1 + i for i in range(count - id_list_cnt)])
        set_max_region_id(whole_item, max_id + count - id_list_cnt)
        return id_list

    id_list = [max_id + 1 + i for i in range(count)]
    set_max_region_id(whole_item, max_id + count)
    return id_list


def remove_region_from_item_assignment(user, subvolume_id, active_assignment_id, region_id):
    """
    remove a region from item assignment
    :param user: requesting user
    :param subvolume_id: subvolume_id that contains the region to be removed
    :param active_assignment_id: the user's active assignment id to remove the region from
    :param region_id: region id or label to remove from the assignment
    :return: a dict with status
    """
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    region_id = str(region_id)
    assign_item = Item().findOne({'_id': ObjectId(active_assignment_id)})
    assign_info = get_history_info(whole_item, assign_item['_id'],
                                    'annotation_assigned_to')
    if assign_info:
        assign_user_login = assign_info[0]['user']
        if assign_user_login != user['login']:
            raise RestException('input region id to be removed is not currently assigned '
                                'to the requesting user', code=400)
        ret = remove_region_from_active_assignment(whole_item, assign_item, region_id)
        if ret:
            ret_dict['assignment_item_id'] = ret
            ret_dict['status'] = 'success'
        else:
            ret_dict['status'] = 'failure'
            ret_dict['assignment_region_key'] = ''
        return ret_dict
    else:
        raise RestException('input region id to be removed is not currently assigned to the '
                            'requesting user', code=400)


def claim_assignment(user, subvolume_id, active_assignment_id, claim_region_id):
    """
    allow a user to claim a neighboring region to add to their assignment
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the claimed region
    :param active_assignment_id: the user's active assignment id to add the claimed region into
    :param claim_region_id: region id or label to find the assignment item to be claimed
    :return: a dict with status and assigned_user_info keys
    """
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    claim_region_id = str(claim_region_id)
    if claim_region_id not in whole_item['meta']['regions']:
        raise RestException('input region id to be claimed is invalid', code=400)
    else:
        val = whole_item['meta']['regions'][claim_region_id]
        done_key = 'annotation_completed_by'
        if 'item_id' in val:
            complete_info = get_history_info(whole_item, val['item_id'], done_key)
        else:
            complete_info = None
        if complete_info:
            raise RestException(f'Annotation of the claimed region has been '
                                f'completed by {complete_info[0]["user"]}', code=400)

        if 'item_id' in val:
            assign_info = get_history_info(whole_item, val['item_id'], 'annotation_assigned_to')
        else:
            assign_info = None

        if assign_info:
            assign_user_login = assign_info[0]['user']
            assigned_user = User().findOne({'login': assign_user_login})
            ret_dict['status'] = 'failure'
            ret_dict['assigned_user_info'] = assign_info
            ret_dict['assigned_user_email'] = assigned_user['email']
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict

        # available to be claimed, merge claimed region to the user's active assignment
        annot_info = merge_region_to_active_assignment(whole_item, active_assignment_id,
                                                        claim_region_id)

        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = annot_info
        ret_dict['assigned_user_email'] = user['email']
        ret_dict['assigned_item_id'] = active_assignment_id
        return ret_dict


def request_assignment(user, subvolume_id, assign_item_id):
    """
    allow a user to request an assignment for annotation or review
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the requested region
    :param assign_item_id: requesting assignment item id
    :return: a dict indicating success or failure
    """
    assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    annot_done_key = 'annotation_completed_by'
    review_done_key = 'review_completed_by'
    complete_info = get_history_info(whole_item, assign_item_id, annot_done_key)
    review_assign_info = get_history_info(whole_item, assign_item_id, 'review_assigned_to')
    review_complete_info = get_history_info(whole_item, assign_item_id, review_done_key)

    if review_complete_info:
        ret_dict['status'] = 'failure'
        if 'review_approved' in assign_item['meta'] and \
            assign_item['meta']['review_approved'] == 'false'and \
            user['login'] == review_complete_info[0]['user']:
                ret_dict['status'] = 'success'

        ret_dict['annotation_user_info'] = complete_info
        ret_dict['review_user_info'] = review_complete_info[0]
        ret_dict['assigned_item_id'] = assign_item_id
        return ret_dict
    if review_assign_info:
        ret_dict['status'] = 'failure'
        if user['login'] == review_assign_info[0]['user']:
            ret_dict['status'] = 'success'

        ret_dict['annotation_user_info'] = complete_info
        ret_dict['review_user_info'] = review_assign_info[0]
        ret_dict['assigned_item_id'] = assign_item_id
        return ret_dict
    if complete_info:
        # annotation is done, ready for review
        # assign this item for review
        assign_info = set_assignment_meta(whole_item, user, assign_item_id,
                                           'review_assigned_to')
        ret_dict['status'] = 'success'
        ret_dict['annotation_user_info'] = complete_info[0]
        ret_dict['review_user_info'] = assign_info
        ret_dict['assigned_item_id'] = assign_item_id
        return ret_dict
    assign_info = get_history_info(whole_item, assign_item, 'annotation_assigned_to')
    if assign_info:
        if assign_info[0]['user'] == user['login']:
            ret_dict['status'] = 'success'
        else:
            ret_dict['status'] = 'failure'
        ret_dict['assigned_user_info'] = assign_info[0]
        ret_dict['assigned_item_id'] = assign_item_id
        return ret_dict

    # available to be assigned
    set_assignment_meta(whole_item, user, assign_item_id, 'annotation_assigned_to')
    assign_info = get_history_info(whole_item, assign_item_id, 'annotation_assigned_to')
    ret_dict['status'] = 'success'
    ret_dict['assigned_user_info'] = assign_info[0] if assign_info else {}
    ret_dict['assigned_item_id'] = str(assign_item['_id'])
    return ret_dict


def get_region_comment_info(item, region_label):
    if 'comment_history' in item['meta'] and region_label in item['meta']['comment_history']:
        return item['meta']['comment_history'][region_label]
    else:
        return []


def get_subvolume_item_ids():
    """
    get all subvolume item ids
    :return: array of dicts with 'id' key indicate subvolume item id and 'parent_id' key indicates
     folder id so that subvolumes can be grouped into a hierachy if needed
    """
    coll = Collection().findOne({'name': COLLECTION_NAME})
    vol_folders = Folder().find({
        'parentId': coll['_id'],
        'parentCollection': 'collection'
    })
    ret_data = []
    for vol_folder in vol_folders:
        sub_vol_folders = Folder().find({
            'parentId': vol_folder['_id'],
            'parentCollection': 'folder'
        })
        for sub_vol_folder in sub_vol_folders:
            folders = Folder().find({
                'parentId': sub_vol_folder['_id'],
                'parentCollection': 'folder'
            })
            for folder in folders:
                whole_item = Item().findOne({'folderId': ObjectId(folder['_id']),
                                             'name': 'whole'})
                ret_data.append({
                    'id': whole_item['_id'],
                    'parent_id': folder['_id']
                })

    return ret_data


def get_item_assignment(user, subvolume_id):
    """
    get region assignment in a subvolume for annotation task. If user has multiple active
    assignments, all active assignments will be returned along with all other assignments the user
    has a role with. If subvolume_id is empty, all assignments across all subvolumes the user has
    a role with will be returned; otherwise, if subvolume_id is set, active assignment for the user
    in the specified volume will be returned or a new assignment in the specified volume will be
    returned if the user does not have active assignment.
    :param user: requesting user to get assignment for
    :param subvolume_id: requesting subvolume id if not empty; otherwise, all subvolumes will be
    considered
    :return: list of assigned item id, subvolume_id, and assignment key or empty
    if no assignment is available
    """
    ret_data = []

    if user['login'] == 'admin':
        return ret_data

    id_list = []
    filtered_id_list = []
    if not subvolume_id:
        subvolume_ids = get_subvolume_item_ids()
        for id_item in subvolume_ids:
            id_list.append(id_item['id'])
    else:
        id_list.append(subvolume_id)

    uid = str(user['_id'])
    annot_done_key = 'annotation_done'
    annot_assign_key = 'annotation_assigned_to'
    review_approved_key = 'review_approved'
    for sub_id in id_list:
        whole_item = Item().findOne({'_id': ObjectId(sub_id)})
        if subvolume_id and review_approved_key in whole_item['meta'] and \
            whole_item['meta'][review_approved_key] == 'true':
            continue

        if subvolume_id and uid in whole_item['meta']:
            for assign_item_id in whole_item['meta'][uid]:
                assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
                ret_type = annot_assign_key
                if annot_done_key in assign_item['meta'] and \
                        assign_item['meta'][annot_done_key] == 'true':
                    ret_type = 'review_assigned_to'
                ret_data.append({
                    'type': ret_type,
                    'item_id': assign_item_id,
                    'subvolume_id': whole_item['_id'],
                    'region_ids': assign_item['meta']['region_ids']
                })
            # only return the user's active assignment
            continue

        if not subvolume_id and 'history' in whole_item['meta']:
            # check other potential assignment the user is involved with
            for assign_item_id, info_ary in whole_item['meta']['history'].items():
                for info in info_ary:
                    if info['user'] == user['login']:
                        assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
                        ret_data.append({
                            'type': info['type'],
                            'item_id': assign_item_id,
                            'subvolume_id': whole_item['_id'],
                            'region_ids': assign_item['meta']['region_ids']
                        })

        filtered_id_list.append(sub_id)

    if ret_data or not subvolume_id:
        # return the user's assignments
        return ret_data

    if not filtered_id_list:
        # there is no available subvolumes to assign to the user, return empty list
        return ret_data

    # this user has no active assignment, assign a new region to the user
    sub_id = filtered_id_list[0]
    whole_item = Item().findOne({'_id': ObjectId(sub_id)})
    assigned_region_id = None
    # no region has been assigned to the user yet, look into the whole partition
    # item to find a region for assignment
    for key, val in whole_item['meta']['regions'].items():
        if annot_done_key in val:
            # if a region is done, continue to check another region
            continue
        # if a region is rejected by the user, continue to check another region
        if 'item_id' in val:
            reject_by_info = get_history_info(whole_item, val['item_id'], 'annotation_rejected_by')
            assign_info = get_history_info(whole_item, val['item_id'], annot_assign_key)
        else:
            reject_by_info = None
            assign_info = None

        is_rejected = False
        if reject_by_info:
            for reject_dict in reject_by_info:
                if reject_dict['user'] == str(user['login']):
                    is_rejected = True
            if is_rejected:
                continue

        if not assign_info:
            # this region can be assigned to a user
            region_item = assign_region_to_user(whole_item, user, key)
            assigned_region_id = region_item['_id']
            assign_regions = region_item['meta']['region_ids']
            break

    if assigned_region_id:
        item_dict = {
            'type': annot_assign_key,
            'item_id': assigned_region_id,
            'subvolume_id': subvolume_id,
            'regions': assign_regions
        }
        ret_data.append(item_dict)

    return ret_data


def save_user_annotation_as_item(user, item_id, done, reject, comment, color, current_region_ids,
                                 content_data):
    """
    Save user annotation to item item_id
    :param user: user object who saves annotation
    :param item_id: item the annotation is saved to
    :param done: whether annotation is done or only an intermediate save
    :param reject: whether to reject the annotation rather than save it.
    :param comment: annotation comment per region from the user
    :param color: color per region from the user
    :param current_region_ids: list of region ids that are included in the annotated mask
    :param content_data: annotation content blob to be saved on server
    :return: success or failure status
    """
    uid = user['_id']
    uname = user['login']
    item = Item().findOne({'_id': ObjectId(item_id)})
    whole_item = Item().findOne({'folderId': ObjectId(item['folderId']),
                                 'name': 'whole'})
    if reject:
        # reject the annotation
        reject_assignment(user, item, whole_item, True, comment)
        return {
            "status": "success"
        }

    files = File().find({'itemId': ObjectId(item_id)})
    annot_file_name = ''
    assetstore_id = ''
    for file in files:
        if '_masks' in file['name']:
            mask_file_name = file['name']
            if mask_file_name.endswith('_user.tif'):
                annot_file_name = mask_file_name
            else:
                annot_file_name = f'{os.path.splitext(mask_file_name)[0]}_user.tif'
            assetstore_id = file['assetstoreId']
            break
    if not annot_file_name or not assetstore_id:
        raise RestException('failure: cannot find the mask file for the annotated item', 500)
    content = content_data.file.read()
    try:
        # save file to local file system before adding it to asset store
        out_dir_path = os.path.join(DATA_PATH, str(item_id))
        out_path = os.path.join(out_dir_path, annot_file_name)
        if not os.path.isdir(out_dir_path):
            os.makedirs(out_dir_path)
        save_content_bytes_to_tiff(content, out_path, item)
        file = save_file(assetstore_id, item, out_path, user, annot_file_name)
    except Exception as e:
        raise RestException(f'failure: {e}', 500)

    done_key = f'annotation_done'
    if done:
        add_meta = {done_key: 'true'}
    else:
        add_meta = {done_key: 'false'}

    for comment_key, comment_val in comment.items():
        add_meta_to_history(whole_item,
                            str(comment_key),
                            {'comment': comment_val,
                             'user': uname,
                             'time': datetime.now().strftime("%m/%d/%Y %H:%M")},
                            key='comment_history')

    if color:
        add_meta['color'] = color

    removed_region_ids = []
    added_region_ids = []
    if current_region_ids:
        # make sure each item is a string
        current_region_ids = [str(rid) for rid in current_region_ids]
        exist_region_ids = item['meta']['region_ids']
        removed_region_ids = [
            rid for rid in exist_region_ids if rid not in current_region_ids
        ]
        added_region_ids = [rid for rid in current_region_ids if rid not in exist_region_ids]

        if added_region_ids:
            add_meta['added_region_ids'] = added_region_ids
        if removed_region_ids:
            add_meta['removed_region_ids'] = removed_region_ids

    Item().setMetadata(item, add_meta)

    if done:
        if removed_region_ids:
            remove_regions(removed_region_ids, whole_item, item_id)
            del item['meta']['removed_region_ids']

        for aid in added_region_ids:
            reg_item = find_region_item_from_label(whole_item, aid)
            if not reg_item:
                # create the region metadata in the whole subvolume
                reg_extent = get_region_extent(item, aid)
                whole_item['meta']['regions'][aid] = {
                    "item_id": str(item['_id']),
                    "x_max": reg_extent['x_max'],
                    "x_min": reg_extent['x_min'],
                    "y_max": reg_extent['y_max'],
                    "y_min": reg_extent['y_min'],
                    "z_max": reg_extent['z_max'],
                    "z_min": reg_extent['z_min']
                }
        uid = str(uid)
        if uid in whole_item['meta']:
            whole_item['meta'][uid].remove(str(item['_id']))
            if not whole_item['meta'][uid]:
                del whole_item['meta'][uid]
        whole_item = Item().save(whole_item)
        info = {
            'type': 'annotation_completed_by',
            'user': uname,
            'time': datetime.now().strftime("%m/%d/%Y %H:%M")
        }
        add_meta_to_history(whole_item, str(item['_id']), info)
        # check if all regions for the partition is done, and if so add done metadata to whole item
        check_subvolume_done(whole_item)

    return {
        'annotation_file_id': file['_id'],
        'status': 'success'
    }


def save_user_review_result_as_item(user, item_id, done, reject, comment, approve, content_data):
    """
    save user review result
    :param user: the review user
    :param item_id: assignment item id to save review result for
    :param done: whether the review is done or not
    :param reject: whether to reject the review assignment rather than save it.
    :param comment: review comment per region added by the user
    :param approve: whether to approve the annotation or not
    :param content_data: reviewer annotation content blob to be saved on server
    :return: JSON response to indicate success or not
    """
    uid = user['_id']
    uname = user['login']
    item = Item().findOne({'_id': ObjectId(item_id)})
    whole_item = Item().findOne({'folderId': ObjectId(item['folderId']),
                                 'name': 'whole'})
    if reject:
        # reject the review assignment
        reject_assignment(user, item, whole_item, False, comment, task='review')
        return {
            "status": "success"
        }

    annot_file_name = None
    if content_data:
        files = File().find({'itemId': ObjectId(item_id)})
        annot_file_name = ''
        assetstore_id = ''
        for file in files:
            if '_masks' in file['name'] and file['name'].endswith('_user.tif'):
                annot_file_name = file['name']
                assetstore_id = file['assetstoreId']
                break
        if not annot_file_name or not assetstore_id:
            raise RestException('failure: cannot find the mask file for the annotated item', 500)
        content = content_data.file.read()

        try:
            # save file to local file system before adding it to asset store
            out_dir_path = os.path.join(DATA_PATH, str(item_id))
            out_path = os.path.join(out_dir_path, annot_file_name)
            if not os.path.isdir(out_dir_path):
                os.makedirs(out_dir_path)
            save_content_bytes_to_tiff(content, out_path, item)
            file = save_file(assetstore_id, item, out_path, user, annot_file_name)
        except Exception as e:
            raise RestException(f'failure: {e}', 500)

    add_meta = {}
    if approve:
        add_meta['review_approved'] = 'true'
    else:
        add_meta['review_approved'] = 'false'

    if not done:
        add_meta['review_done'] = 'false'
    else:
        if not approve:
            # update user key with annotation user to get disapproved assignment back to the user
            complete_info = get_history_info(whole_item, item_id, 'annotation_completed_by')
            annot_uname = complete_info[0]['user']
            annot_user = User().findOne({'login': annot_uname})
            set_assignment_meta(whole_item, annot_user, item_id, 'annotation_assigned_to')
            add_meta['annotation_done'] = 'false'
            add_meta['review_done'] = 'false'
        else:
            # update whole volume masks with approved annotations
            if annot_file_name:
                update_assignment_in_whole_item(whole_item, item_id, mask_file_name=annot_file_name)
            else:
                update_assignment_in_whole_item(whole_item, item_id)
            # update all assignments of the subvolume asyncly as a job
            update_all_assignment_masks_async(whole_item, item_id)
            add_meta['review_done'] = 'true'

    for comment_key, comment_val in comment.items():
        add_meta_to_history(whole_item,
                             str(comment_key),
                             {'comment': comment_val,
                              'user': uname,
                              'time': datetime.now().strftime("%m/%d/%Y %H:%M")},
                             key='comment_history')

    Item().setMetadata(item, add_meta)

    uid = str(uid)
    if done and uid in whole_item['meta']:
        whole_item['meta'][uid].remove(str(item['_id']))
        if not whole_item['meta'][uid]:
            del whole_item['meta'][uid]

    whole_item = Item().save(whole_item)

    if done:
        info = {
            'type': 'review_completed_by',
            'user': uname,
            'time': datetime.now().strftime("%m/%d/%Y %H:%M")
        }
        add_meta_to_history(whole_item, item_id, info)
        # check if all regions for the partition is done, and if so add done metadata to whole item
        check_subvolume_done(whole_item, task='review')

    return {'status': 'success'}


def get_subvolume_item_info(item):
    """
    get subvolume item info
    :param item: subvolume item id
    :return: item info dict including name, description, location, total_regions,
    total_annotation_completed_regions, total_annotation_active_regions,
    total_annotation_available_regions, total_review_completed_regions, total_review_active_regions,
    total_review_available_regions
    """
    item_id = item['_id']
    region_dict = item['meta']['regions']
    total_regions = len(region_dict)
    ret_dict = {
        'id': item_id,
        'name': Folder().findOne({'_id': item['folderId']})['name'],
        'description': item['description'],
        'location': item['meta']['coordinates'],
        'total_regions': total_regions,
        'intensity_ranges': item['meta']['intensity_range_per_slice'],
        'history': item['meta']['history'] if 'history' in item['meta'] else {}
    }
    annot_done_key = 'annotation_done'
    review_done_key = 'review_done'
    review_approved_key = 'review_approved'
    annot_done = False
    review_done = False
    review_approved = False
    if annot_done_key in item['meta'] and item['meta'][annot_done_key] == 'true':
        ret_dict['total_annotation_completed_regions'] = total_regions
        ret_dict['total_annotation_active_regions'] = 0
        ret_dict['total_annotation_available_regions'] = 0
        annot_done = True
    if review_done_key in item['meta'] and item['meta'][review_done_key] == 'true':
        ret_dict['total_review_completed_regions'] = total_regions
        ret_dict['total_review_active_regions'] = 0
        ret_dict['total_review_available_regions'] = 0
        review_done = True
    if review_approved_key in item['meta'] and item['meta'][review_approved_key] == 'true':
        ret_dict['total_review_approved_regions'] = total_regions
        review_approved = True

    total_regions_done = 0
    total_regions_at_work = 0
    total_regions_review_approved = 0
    regions_rejected = []
    if ret_dict['history']:
        for reg_lbl, history_info_ary in ret_dict['history'].items():
            for history_info in history_info_ary:
                if history_info['type'] == 'annotation_rejected_by':
                    regions_rejected.append(history_info)
    ret_dict['rejected_regions'] = regions_rejected
    annot_completed_key = 'annotation_completed_by'
    review_completed_key = 'review_completed_by'
    total_reviewed_regions_done = 0
    total_reviewed_regions_at_work = 0

    for key, val in region_dict.items():
        if 'item_id' in val:
            assign_info = get_history_info(item, val['item_id'], 'annotation_assigned_to')
            review_assign_info = get_history_info(item, val['item_id'], 'review_assigned_to')
            complete_info = get_history_info(item, val['item_id'], annot_completed_key)
            review_complete_info = get_history_info(item, val['item_id'], review_completed_key)
        else:
            assign_info = None
            review_assign_info = None
            complete_info = None
            review_complete_info = None
        if not annot_done:
            if complete_info:
                total_regions_done += 1
            elif assign_info:
                total_regions_at_work += 1
        if not review_done:
            if review_complete_info:
                total_reviewed_regions_done += 1
            elif complete_info and review_assign_info:
                # annotation is done but review is not done and a user is reviewing currently
                total_reviewed_regions_at_work += 1
        if not review_approved and review_complete_info:
            total_regions_review_approved += 1

    if annot_done and review_done and review_approved:
        return ret_dict
    if annot_done and review_done:
        # annotation and review are done but not all reviewed regions are approved
        ret_dict['total_review_approved_regions'] = total_regions_review_approved
        return ret_dict
    if annot_done:
        # annotation is done, but review is not done
        ret_dict['total_review_completed_regions'] = total_reviewed_regions_done
        ret_dict['total_review_active_regions'] = total_reviewed_regions_at_work
        ret_dict['total_review_approved_regions'] = total_regions_review_approved
        ret_dict['total_review_available_regions'] = total_regions - total_reviewed_regions_done - \
            total_reviewed_regions_at_work
        return ret_dict

    # both annotation and review are not done
    ret_dict['total_annotation_completed_regions'] = total_regions_done
    ret_dict['total_annotation_active_regions'] = total_regions_at_work
    ret_dict['total_annotation_available_regions'] = total_regions - total_regions_done - \
        total_regions_at_work
    ret_dict['total_review_completed_regions'] = total_reviewed_regions_done
    ret_dict['total_review_approved_regions'] = total_regions_review_approved
    ret_dict['total_review_active_regions'] = total_reviewed_regions_at_work
    ret_dict['total_review_available_regions'] = total_regions - total_reviewed_regions_done - \
        total_reviewed_regions_at_work
    return ret_dict


def get_region_or_assignment_info(item, assign_item_id, region_id):
    """
    get region info or assignment info if the region is part of the assignment
    :param item: subvolume item that contains the region
    :param assign_item_id: assignment item id to get assignment info for
    :param region_id: region label number such as 1, 2, etc. in the assignment
    :return: dict of region or assignment info
    """
    if not assign_item_id and not region_id:
        raise RestException('Either assign_item_id or region_id has to be provided in order to '
                            'identify the assignment to get info for', code=400)
    if not assign_item_id:
        region_label_str = str(region_id)
        if region_label_str in item['meta']['regions']:
            region_dict = item['meta']['regions'][region_label_str]
            assign_item_id = region_dict['item_id'] if 'item_id' in region_dict else ''
            if not assign_item_id:
                # region is not assigned yet
                return {
                    'status': 'inactive'
                }
        else:
            raise RestException('no assignment found', code=400)

    region_item = Item().findOne({'_id': ObjectId(assign_item_id)}) if assign_item_id else None
    if not region_item:
        raise RestException('no assignment found', code=400)

    regions = []
    for rid in region_item['meta']['region_ids']:
        regions.append({
            'label': rid
        })
    if 'added_region_ids' in region_item['meta']:
        for rid in region_item['meta']['added_region_ids']:
            if rid not in region_item['meta']['region_ids']:
                regions.append({
                    'label': rid
                })
    if 'removed_region_ids' in region_item['meta']:
        for rid in region_item['meta']['removed_region_ids']:
            current_region = {'label': rid}
            if current_region in regions:
                regions.remove(current_region)

    assign_info = get_history_info(item, assign_item_id, 'annotation_assigned_to')
    annotator_info = {}
    reviewer_info = {}
    if assign_info:
        annotator_username = assign_info[-1]['user']
        annotator_info['login'] = annotator_username
        annotator_info['id'] = User().findOne({'login': annotator_username})['_id']
        review_info = get_history_info(item, assign_item_id, 'review_assigned_to')
        if review_info:
            review_username = review_info[-1]['user']
            reviewer_info['login'] = review_username
            reviewer_info['id'] = User().findOne({'login': review_username})['_id']

    ret_dict = {
        'item_id': assign_item_id,
        'name': region_item['name'] if region_item else '',
        'description': region_item['description'] if region_item else '',
        'annotator': annotator_info,
        'reviewer': reviewer_info,
        'location': region_item['meta']['coordinates'] if region_item else {},
        'last_updated_time': region_item['updated'] if region_item else '',
        'regions': regions,
        'color': region_item['meta']['color'] \
        if region_item and 'color' in region_item['meta'] else {},
        'status': get_assignment_status(item, assign_item_id) if region_item else 'inactive'
    }

    return ret_dict


def get_all_avail_items_for_review(item):
    """
    Get all finished annotation assignments that are available for review
    :param item: the subvolume whole item from which to retrieve available items for review
    :return: list of available item ids
    """
    region_dict = item['meta']['regions']
    avail_item_list = []
    for key, val in region_dict.items():
        if 'item_id' in val:
            complete_info = get_history_info(item, val['item_id'], 'annotation_completed_by')
            review_complete_info = get_history_info(item, val['item_id'], 'review_completed_by')
        else:
            complete_info = None
            review_complete_info = None

        if complete_info and not review_complete_info:
            avail_item_list.append({
                'id': val['item_id'],
                'annotation_completed_by': complete_info,
                'annotation_rejected_by': get_history_info(item, key, 'annotation_rejected_by'),
                'review_rejected_by': get_history_info(item, key, 'review_rejected_by'),
                'annotation_assigned_to': get_history_info(item, key, 'annotation_assigned_to')
            })
    return avail_item_list
