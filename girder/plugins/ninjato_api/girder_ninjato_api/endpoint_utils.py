import random
from datetime import datetime
from girder.models.item import Item
from girder.models.user import User
from bson.objectid import ObjectId
from girder.models.collection import Collection
from girder.models.folder import Folder
from girder.exceptions import RestException
from .utils import TRAINING_COLLECTION_NAME, COLLECTION_NAME, ANNOT_ASSIGN_KEY, \
    ANNOT_COMPLETE_KEY, REVIEW_ASSIGN_KEY, REVIEW_COMPLETE_KEY, REVIEW_DONE_KEY, \
    REVIEW_APPROVE_KEY, ASSIGN_COUNT_FOR_REVIEW, get_max_region_id, set_max_region_id, \
    remove_region_from_active_assignment, merge_region_to_active_assignment, set_assignment_meta, \
    get_history_info, assign_region_to_user, add_meta_to_history, check_subvolume_done, \
    reject_assignment, update_assignment_in_whole_item, get_assignment_status, \
    WHOLE_ITEM_NAME, save_content_data, save_added_and_removed_regions, \
    get_completed_assignment_items, update_all_assignment_masks_async


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
            whole_item['meta']['removed_region_ids'] = id_list[count:]
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


def remove_region_from_item_assignment(user, subvolume_id, active_assignment_id, region_id,
                                       current_region_ids, content_data):
    """
    remove a region from item assignment
    :param user: requesting user
    :param subvolume_id: subvolume_id that contains the region to be removed
    :param active_assignment_id: the user's active assignment id to remove the region from
    :param region_id: region id or label to remove from the assignment
    :param current_region_ids: current region ids of the user mask of the current assignment
    :param content_data: current assignment user mask
    :return: a dict with status
    """
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    region_id = str(region_id)
    assign_info = get_history_info(whole_item, active_assignment_id, ANNOT_ASSIGN_KEY)
    if assign_info:
        assign_user_login = assign_info[0]['user']
        if assign_user_login != user['login']:
            review_assign_info = get_history_info(whole_item, active_assignment_id,
                                                  REVIEW_ASSIGN_KEY)
            if review_assign_info and review_assign_info[0]['user'] != user['login']:
                raise RestException('input region id to be removed is not currently assigned '
                                    'to the requesting user', code=400)
        ret = remove_region_from_active_assignment(whole_item, active_assignment_id, region_id,
                                                   current_region_ids, content_data)
        if ret:
            ret_dict['assignment_item_id'] = ret
            ret_dict['status'] = 'success'
        else:
            ret_dict['status'] = 'failure'
            ret_dict['assignment_region_key'] = ''
        return ret_dict
    else:
        raise RestException('input region id to be removed is not currently assigned', code=400)


def claim_assignment(user, subvolume_id, active_assignment_id, claim_region_id,
                     current_region_ids, content_data):
    """
    allow a user to claim a neighboring region to add to their assignment
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the claimed region
    :param active_assignment_id: the user's active assignment id to add the claimed region into
    :param claim_region_id: region id or label to find the assignment item to be claimed
    :param current_region_ids: current region ids of the user mask of the current assignment
    :param content_data: current assignment user mask
    :return: a dict with status and assigned_user_info keys
    """
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    claim_region_id = str(claim_region_id)
    if claim_region_id not in whole_item['meta']['regions']:
        raise RestException('input region id to be claimed is invalid', code=400)
    else:
        val = whole_item['meta']['regions'][claim_region_id]
        if REVIEW_APPROVE_KEY in val and val[REVIEW_APPROVE_KEY] == 'true':
            # claimed region has been verified
            raise RestException(f'The claimed region has been verified', code=400)
        if 'item_id' in val:
            complete_info = get_history_info(whole_item, val['item_id'], ANNOT_COMPLETE_KEY)
        else:
            complete_info = None
        if complete_info:
            raise RestException(f'Annotation of the claimed region has been '
                                f'completed by {complete_info[0]["user"]}', code=400)

        if 'item_id' in val:
            assign_info = get_history_info(whole_item, val['item_id'], ANNOT_ASSIGN_KEY)
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
                                                       claim_region_id, current_region_ids,
                                                       content_data)

        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = annot_info
        ret_dict['assigned_user_email'] = user['email']
        ret_dict['assigned_item_id'] = active_assignment_id
        return ret_dict


def request_assignment(user, subvolume_id, assign_item_id, request_region_id,
                       request_review_assignment):
    """
    allow a user to request an assignment for annotation or review
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the requested region
    :param assign_item_id: assign_item_id to request assignment for
    :param request_region_id: region id to request assignment for
    :param request_review_assignment: True means requesting review assignment; False means
    requesting annotation assignment
    :return: a dict indicating success or failure
    """
    if not assign_item_id and not request_region_id:
        raise RestException('Either assign_item_id or region_id has to be provided in order to '
                            'identify the assignment to get info for', code=400)

    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    # check if the requesting user already has active assignment, and if yes, this user cannot
    # request other assignment
    uid = user['_id']
    if not request_review_assignment:
        if uid in whole_item['meta']:
            for item_id in whole_item['meta'][uid]:
                annot_info = get_history_info(whole_item, item_id, ANNOT_ASSIGN_KEY)
                review_assign_info = get_history_info(whole_item, item_id, REVIEW_ASSIGN_KEY)
                if annot_info and annot_info[0]['user'] == user['login'] and \
                    (not review_assign_info or review_assign_info[0]['user'] != user['login']):
                    raise RestException('Requesting user already has active annotation assignment '
                                        'so cannot request a new annotation assignment', code=400)

    ret_dict = {}
    if not assign_item_id:
        request_region_id = str(request_region_id)
        if request_region_id not in whole_item['meta']['regions']:
            raise RestException('The requested region id is not valid', code=400)
        val = whole_item['meta']['regions'][request_region_id]
        if REVIEW_APPROVE_KEY in val and val[REVIEW_APPROVE_KEY] == 'true':
            raise RestException('The requested region has been approved outside Ninjato', code=400)
        assign_item_id = val['item_id'] if 'item_id' in val else ''

    if assign_item_id:
        assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
        complete_info = get_history_info(whole_item, assign_item_id, ANNOT_COMPLETE_KEY)
        review_complete_info = get_history_info(whole_item, assign_item_id, REVIEW_COMPLETE_KEY)
        if review_complete_info and complete_info[0]['time'] < review_complete_info[0]['time']:
            # assignment is reassigned to user after reviewer disapproved the annotation, not
            # ready for review again yet
            if request_review_assignment:
                raise RestException('The requested assignment was sent back for re-annotation that '
                                    'has not yet completed, so it cannot be requested for review')
            # request annotation assignment
            ret_dict['status'] = 'failure'
            if REVIEW_APPROVE_KEY in assign_item['meta'] and \
                assign_item['meta'][REVIEW_APPROVE_KEY] == 'false' and \
                user['login'] == complete_info[0]['user']:
                ret_dict['status'] = 'success'

            ret_dict['assigned_user_info'] = complete_info[0]
            ret_dict['assigned_item_id'] = assign_item_id
            return ret_dict

        # annotation is complete and ready for review again or under review already
        review_assign_info = get_history_info(whole_item, assign_item_id, REVIEW_ASSIGN_KEY)
        if review_assign_info and complete_info[0]['time'] < review_assign_info[0]['time']:
            # it is under review already
            if not request_review_assignment:
                raise RestException('The requested item is currently under review, '
                                    'so it cannot be requested for annotation')

            if user['login'] == review_assign_info[0]['user']:
                ret_dict['status'] = 'success'
            else:
                ret_dict['status'] = 'failure'

            ret_dict['assigned_user_info'] = complete_info[0]
            ret_dict['assigned_item_id'] = assign_item_id
            return ret_dict
        if complete_info:
            # annotation is done, ready for review
            # assign this item for review
            if not request_review_assignment:
                raise RestException('The requested item is done with annotation and awaiting '
                                    'review, so it cannot be requested for annotation')
            assign_info = set_assignment_meta(whole_item, user, assign_item_id,
                                              REVIEW_ASSIGN_KEY)
            ret_dict['status'] = 'success'
            ret_dict['annotation_user_info'] = complete_info[0]
            ret_dict['review_user_info'] = assign_info
            ret_dict['assigned_item_id'] = assign_item_id
            return ret_dict
        assign_info = get_history_info(whole_item, assign_item_id, ANNOT_ASSIGN_KEY)
        if assign_info:
            if request_review_assignment:
                raise RestException('The requested item is under annotation, so not yet ready '
                                    'for review')
            if assign_info[0]['user'] == user['login']:
                ret_dict['status'] = 'success'
            else:
                ret_dict['status'] = 'failure'
            ret_dict['assigned_user_info'] = assign_info[0]
            ret_dict['assigned_item_id'] = assign_item_id
            return ret_dict
        # available to be assigned
        if request_review_assignment:
            raise RestException('The requested assignment is not annotated yet, so it cannot be '
                                'requested for review assignment')
        set_assignment_meta(whole_item, user, assign_item_id, ANNOT_ASSIGN_KEY)
        assign_info = get_history_info(whole_item, assign_item_id, ANNOT_ASSIGN_KEY)
        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = assign_info[0] if assign_info else {}
        ret_dict['assigned_item_id'] = str(assign_item['_id'])
        return ret_dict

    if not request_review_assignment:
        # assign_item_id does not exist, assign this region to this user
        assign_item = assign_region_to_user(whole_item, user, request_region_id)
        assign_item_id = assign_item['_id']
        assign_info = get_history_info(whole_item, assign_item_id, ANNOT_ASSIGN_KEY)
        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = assign_info[0] if assign_info else {}
        ret_dict['assigned_item_id'] = str(assign_item['_id'])
        return ret_dict
    else:
        raise RestException('The requested assignment is not annotated yet, so it cannot be '
                            'requested for review assignment')


def get_region_comment_info(item, region_label):
    if 'comment_history' in item['meta'] and region_label in item['meta']['comment_history']:
        return item['meta']['comment_history'][region_label]
    else:
        return []


def get_subvolume_item_ids(training):
    """
    get all subvolume item ids from training data collection if training parameter is True;
    otherwise, get all subvolume item ids from annotation data collection
    :return: array of dicts with 'id' key indicate subvolume item id and 'parent_id' key indicates
     folder id so that subvolumes can be grouped into a hierachy if needed
    """
    ret_data = []
    if training:
        coll = Collection().findOne({'name': TRAINING_COLLECTION_NAME})
    else:
        coll = Collection().findOne({'name': COLLECTION_NAME})
    if not coll:
        return ret_data
    vol_folders = Folder().find({
        'parentId': coll['_id'],
        'parentCollection': 'collection'
    })
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
                                             'name': WHOLE_ITEM_NAME})
                ret_data.append({
                    'id': whole_item['_id'],
                    'parent_id': folder['_id']
                })

    return ret_data


def get_item_assignment(user, subvolume_id, request_new, training):
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
    :param request_new: whether to request new assignment for refine action. Default is False
    :param training: whether to get assignment from training volumes or not
    :return: list of assigned item id, subvolume_id, and assignment key or empty
    if no assignment is available
    """
    ret_data = []
    if user['login'] == 'admin':
        return ret_data

    id_list = []
    filtered_id_list = []
    if not subvolume_id:
        subvolume_ids = get_subvolume_item_ids(training)
        for id_item in subvolume_ids:
            id_list.append(id_item['id'])
    else:
        id_list.append(subvolume_id)

    uid = str(user['_id'])
    annot_done_key = 'annotation_done'

    for sub_id in id_list:
        whole_item = Item().findOne({'_id': ObjectId(sub_id)})
        if subvolume_id and REVIEW_APPROVE_KEY in whole_item['meta'] and \
            whole_item['meta'][REVIEW_APPROVE_KEY] == 'true':
            continue

        if subvolume_id and uid in whole_item['meta']:
            for assign_item_id in whole_item['meta'][uid]:
                assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
                ret_type = ANNOT_ASSIGN_KEY
                if annot_done_key in assign_item['meta'] and \
                        assign_item['meta'][annot_done_key] == 'true':
                    ret_type = REVIEW_ASSIGN_KEY
                if ret_type == ANNOT_ASSIGN_KEY and request_new:
                    # user already has active refine assignment, cannot request new assignment
                    raise RestException(
                        'The request user already has active refine assignment, so cannot request '
                        'a new assignment', code=400)
                if not request_new:
                    ret_data.append({
                        'type': ret_type,
                        'status': 'active',
                        'item_id': assign_item_id,
                        'subvolume_id': whole_item['_id'],
                        'region_ids': assign_item['meta']['region_ids']
                    })
            if not request_new:
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
                            'status': get_assignment_status(whole_item, assign_item_id),
                            'item_id': assign_item_id,
                            'subvolume_id': whole_item['_id'],
                            'region_ids': assign_item['meta']['region_ids']
                        })

        filtered_id_list.append(sub_id)
    if not request_new or not subvolume_id:
        # return the user's assignments
        return ret_data

    if not filtered_id_list:
        # there is no available subvolumes to assign to the user, return empty list
        return ret_data

    # this user has no active assignment, assign a new region to the user
    sub_id = filtered_id_list[0]
    whole_item = Item().findOne({'_id': ObjectId(sub_id)})

    # no region has been assigned to the user yet, look into the whole partition
    # item to find a region for assignment
    # filter out those regions unavailable for assignment first
    avail_region_items = {}
    for key, val in whole_item['meta']['regions'].items():
        if REVIEW_APPROVE_KEY in val and val[REVIEW_APPROVE_KEY] == 'true':
            # if a region is approved/verified outside ninjato, this review_approved_key can be
            # set to true for the region metadata, so this region will not be assigned to new users
            continue

        # if a region is rejected by the user, continue to check another region
        if 'item_id' in val:
            reject_by_info = get_history_info(whole_item, val['item_id'],
                                              'annotation_rejected_by')
            if reject_by_info:
                user_rejected = False
                for reject_dict in reject_by_info:
                    if reject_dict['user'] == str(user['login']):
                        # this assignment has been rejected by this user
                        user_rejected = True
                        break
                if user_rejected:
                    # user rejected this assignment, continue to check another assignment
                    continue
            if get_history_info(whole_item, val['item_id'], ANNOT_ASSIGN_KEY):
                continue

        avail_region_items[key] = val

    # randomize available item to assign to users to minimize adjacent region assignment
    if len(avail_region_items) > 0:
        key, val = random.choice(list(avail_region_items.items()))
        # this region can be assigned to a user
        region_item = assign_region_to_user(whole_item, user, key)
        assigned_region_id = region_item['_id']
        assign_regions = region_item['meta']['region_ids']
        if assigned_region_id:
            item_dict = {
                'type': ANNOT_ASSIGN_KEY,
                'status': 'active',
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
                                 'name': WHOLE_ITEM_NAME})
    if reject:
        # reject the annotation
        reject_assignment(user, item, whole_item, True, comment)
        return {
            "status": "success"
        }

    annot_file_name = save_content_data(user, item_id, content_data)

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
                             'time': datetime.now().strftime("%m/%d/%Y %H:%M:%S")},
                            key='comment_history')

    if color:
        add_meta['color'] = color

    whole_item = save_added_and_removed_regions(whole_item, item, current_region_ids,
                                                done, uid, add_meta)

    selected_for_review = False
    if done:
        info = {
            'type': ANNOT_COMPLETE_KEY,
            'user': uname,
            'time': datetime.now().strftime("%m/%d/%Y %H:%M:%S")
        }
        add_meta_to_history(whole_item, str(item['_id']), info)
        # check if all regions for the partition is done, and if so add done metadata to whole item
        check_subvolume_done(whole_item)
        review_info = get_history_info(whole_item, item['_id'], REVIEW_COMPLETE_KEY)
        if not review_info:
            # the first time the annotation assignment is submitted,
            # check how many assignments the user has done to determine whether to set the
            # assignment for review or not
            annot_complete_list = get_completed_assignment_items(uname, whole_item)
            if len(annot_complete_list) % ASSIGN_COUNT_FOR_REVIEW != 0:
                # no need to review this completed annotation assignment
                add_meta = {
                    REVIEW_APPROVE_KEY: 'true',
                    REVIEW_DONE_KEY: 'false'
                }
                Item().setMetadata(item, add_meta)
            else:
                selected_for_review = True
        else:
            # the assignment is already reviewed and sent back from reviewers for reannotation
            selected_for_review = True

    return {
        'annotation_file_name': annot_file_name,
        'selected_for_review': selected_for_review,
        'status': 'success'
    }


def save_user_review_result_as_item(user, item_id, done, reject, comment, approve,
                                    current_region_ids, content_data):
    """
    save user review result
    :param user: the review user
    :param item_id: assignment item id to save review result for
    :param done: whether the review is done or not
    :param reject: whether to reject the review assignment rather than save it.
    :param comment: review comment per region added by the user
    :param approve: whether to approve the annotation or not
    :param current_region_ids: list of region ids that are included in the annotated mask
    :param content_data: reviewer annotation content blob to be saved on server
    :return: JSON response to indicate success or not
    """
    uid = user['_id']
    uname = user['login']
    item = Item().findOne({'_id': ObjectId(item_id)})
    whole_item = Item().findOne({'folderId': ObjectId(item['folderId']),
                                 'name': WHOLE_ITEM_NAME})
    if reject:
        # reject the review assignment
        reject_assignment(user, item, whole_item, False, comment, task='review')
        return {
            "status": "success"
        }

    if content_data:
        annot_file_name = save_content_data(user, item_id, content_data, review=True)
    else:
        annot_file_name = ''

    add_meta = {}
    if approve:
        add_meta[REVIEW_APPROVE_KEY] = 'true'
    else:
        add_meta[REVIEW_APPROVE_KEY] = 'false'

    if not done:
        add_meta[REVIEW_DONE_KEY] = 'false'
    else:
        if approve:
            # update whole volume masks with approved annotations
            if annot_file_name:
                update_assignment_in_whole_item(whole_item, item_id, mask_file_name=annot_file_name)
            else:
                update_assignment_in_whole_item(whole_item, item_id)
            # update all assignments of the subvolume asyncly as a job
            update_all_assignment_masks_async(whole_item, item_id)
            add_meta[REVIEW_DONE_KEY] = 'true'

    for comment_key, comment_val in comment.items():
        add_meta_to_history(whole_item,
                             str(comment_key),
                             {'comment': comment_val,
                              'user': uname,
                              'time': datetime.now().strftime("%m/%d/%Y %H:%M:%S")},
                             key='comment_history')
    whole_item = save_added_and_removed_regions(whole_item, item, current_region_ids,
                                                done, uid, add_meta)
    if done:
        info = {
            'type': 'review_completed_by',
            'user': uname,
            'time': datetime.now().strftime("%m/%d/%Y %H:%M:%S")
        }
        add_meta_to_history(whole_item, item_id, info)
        if not approve:
            # update user key with annotation user to get disapproved assignment back to the user
            complete_info = get_history_info(whole_item, item_id, ANNOT_COMPLETE_KEY)
            annot_uname = complete_info[0]['user']
            annot_user = User().findOne({'login': annot_uname})
            set_assignment_meta(whole_item, annot_user, item_id, ANNOT_ASSIGN_KEY)
            add_meta['annotation_done'] = 'false'
            add_meta[REVIEW_DONE_KEY] = 'false'
        # check if all regions for the partition is done, and if so add done metadata to whole item
        check_subvolume_done(whole_item, task='review')

    return {
        'status': 'success'
    }


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
        'training_user': item['meta']['training_user'] if 'training_user' in item['meta'] else '',
        'history': item['meta']['history'] if 'history' in item['meta'] else {}
    }
    annot_done_key = 'annotation_done'
    annot_done = False
    review_done = False
    review_approved = False
    if annot_done_key in item['meta'] and item['meta'][annot_done_key] == 'true':
        ret_dict['total_annotation_completed_regions'] = total_regions
        ret_dict['total_annotation_active_regions'] = 0
        ret_dict['total_annotation_available_regions'] = 0
        annot_done = True
    if REVIEW_DONE_KEY in item['meta'] and item['meta'][REVIEW_DONE_KEY] == 'true':
        ret_dict['total_review_completed_regions'] = total_regions
        ret_dict['total_review_active_regions'] = 0
        ret_dict['total_review_available_regions'] = 0
        review_done = True
    if REVIEW_APPROVE_KEY in item['meta'] and item['meta'][REVIEW_APPROVE_KEY] == 'true':
        ret_dict['total_review_approved_regions'] = total_regions
        review_approved = True

    total_regions_done = 0
    total_regions_at_work = 0
    total_regions_review_approved = 0
    total_reviewed_regions_done = 0
    total_reviewed_regions_at_work = 0

    for key, val in region_dict.items():
        if 'item_id' in val:
            assign_status = get_assignment_status(item, val['item_id'])
            review_complete_info = get_history_info(item, val['item_id'], REVIEW_COMPLETE_KEY)
        else:
            if REVIEW_APPROVE_KEY in val and val[REVIEW_APPROVE_KEY] == 'true':
                total_regions_review_approved += 1
                total_regions_done += 1
            continue

        if assign_status == 'completed':
            total_regions_review_approved += 1
            total_reviewed_regions_done += 1
            total_regions_done += 1
        if not annot_done:
            if assign_status == 'active':
                total_regions_at_work += 1
            elif assign_status == 'awaiting review':
                total_regions_done += 1
        if not review_done:
            if assign_status == 'under review':
                total_reviewed_regions_at_work += 1
            elif assign_status == 'active' and review_complete_info:
                total_reviewed_regions_done += 1

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
        ret_dict['total_review_available_regions'] = total_regions_done - \
                                                     total_regions_review_approved - \
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
            if REVIEW_APPROVE_KEY in region_dict and region_dict[REVIEW_APPROVE_KEY] == 'true':
                # region is verified
                return {
                    'item_id': '',
                    'status': 'completed'
                }
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

    assign_info = get_history_info(item, assign_item_id, ANNOT_ASSIGN_KEY)
    annotator_info = {}
    reviewer_info = {}
    if assign_info:
        annotator_username = assign_info[-1]['user']
        annotator_info['login'] = annotator_username
        annotator_info['id'] = User().findOne({'login': annotator_username})['_id']
        review_info = get_history_info(item, assign_item_id, REVIEW_ASSIGN_KEY)
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
            assign_item = Item().findOne({'_id': ObjectId(val['item_id'])})
            if REVIEW_APPROVE_KEY in assign_item['meta'] and \
                assign_item['meta'][REVIEW_APPROVE_KEY] == 'true':
                continue
            complete_info = get_history_info(item, val['item_id'], ANNOT_COMPLETE_KEY)
            review_assign_info = get_history_info(item, val['item_id'], REVIEW_ASSIGN_KEY)
            if not complete_info:
                continue
            add_metadata = {
                'id': val['item_id'],
                'annotation_completed_by': complete_info,
                'annotation_rejected_by': get_history_info(item, val['item_id'],
                                                           'annotation_rejected_by'),
                'review_rejected_by': get_history_info(item, val['item_id'], 'review_rejected_by'),
                'annotation_assigned_to': get_history_info(item, val['item_id'], ANNOT_ASSIGN_KEY)
            }
            if not review_assign_info:
                avail_item_list.append(add_metadata)
                continue
            # assignment completed and review assigned, need to check time stamp to see if
            # assignment is completed after initial review assignment
            complete_time = complete_info[0]['time']
            review_assign_time = review_assign_info[0]['time']
            if complete_time > review_assign_time:
                # assignment is completed after initial review assignment, so ready for review again
                avail_item_list.append(add_metadata)

    return avail_item_list
