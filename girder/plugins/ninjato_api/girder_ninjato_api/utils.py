import os
import shutil
from datetime import datetime
from libtiff import TIFF
import numpy as np
from girder.models.item import Item
from girder.models.file import File
from girder.models.user import User
from bson.objectid import ObjectId
from girder.models.assetstore import Assetstore as AssetstoreModel
from girder.models.collection import Collection
from girder.models.folder import Folder
from girder.exceptions import RestException
from girder.utility import assetstore_utilities
from girder.utility import path as path_util
from .constants import COLLECTION_NAME, BUFFER_FACTOR, DATA_PATH


def _save_file(as_id, item, path, user, file_name):
    """
    save file to an item in the asset store
    :param as_id: asset id to get asset store to save file
    :param item: item to save file to
    :param path: path where file is stored
    :param user: requesting user to save file
    :param file_name: file name in path to be stored in the asset store
    :return: the file object that has been saved
    """
    asset_store = AssetstoreModel().load(as_id)
    adapter = assetstore_utilities.getAssetstoreAdapter(asset_store)
    file = adapter.importFile(item, path, user, name=file_name, mimeType='image/tiff')
    return file


def get_available_region_ids(whole_item, count=1):
    """
    return max region id followed by increasing max region id by delta in an atomic operation
    :param whole_item: whole item to get available region ids
    :param count: number of available ids to get
    :return: available count number of region ids
    """
    max_id = int(whole_item['meta']['max_region_id'])
    if 'removed_region_ids' in whole_item['meta'] and whole_item['meta']['removed_region_ids']:
        id_list =  whole_item['meta']['removed_region_ids']
        id_list_cnt = len(id_list)
        if id_list_cnt == count:
            whole_item['meta']['removed_region_ids'] = []
            return id_list
        if id_list_cnt > count:
            whole_item['meta']['removed_region_ids'] = id_list_cnt[count:]
            return id_list[:count]
        # id_list_cnt < count, so append more available ids
        whole_item['meta']['removed_region_ids'] = []
        id_list.extend([max_id + i for i in range(count - id_list_cnt)])
        _set_max_region_id(whole_item, max_id + count - id_list_cnt)
        return id_list

    id_list = [max_id + i for i in range(count)]
    _set_max_region_id(whole_item, max_id + count)
    return id_list


def _set_max_region_id(whole_item, max_level=None):
    if not max_level:
        max_level = len(whole_item['meta']['regions'])
    add_meta = {
        'max_region_id': max_level
    }
    Item().setMetadata(whole_item, add_meta)


def _get_tif_file_content_and_path(item_file):
    """
    get tif file content and its associated path in an item file
    :param item_file: a file in an item
    :return: tif content and its associated path
    """
    file = File().load(item_file['_id'], force=True)
    file_path = File().getLocalFilePath(file)
    tif = TIFF.open(file_path, mode="r")
    return tif, file_path


def _get_buffered_extent(minx, maxx, miny, maxy, minz, maxz, xrange, yrange, zrange):
    """
    get buffered extent for creating a new region which contains the region and the beffer around it
    :param minx: minimum x of the region
    :param maxx: maximum x of the region
    :param miny: minimum y of the region
    :param maxy: maximum y of the region
    :param minz: minimum z of the region
    :param maxz: maximum z of the region
    :param xrange: x range of the subvolume containing the region
    :param yrange: t range of the subvolume containing the region
    :param zrange: z range of the subvolume containing the region
    :return: bounding box along x, y, z of the beffered extent of the region
    """
    width = maxx - minx
    height = maxy - miny

    if height > width:
        end_size = height * BUFFER_FACTOR
        half_height = int((end_size - height) / 2 + 0.5)
        half_width = int((end_size - width) / 2 + 0.5)
    else:
        end_size = width * BUFFER_FACTOR
        half_width = int((end_size - width) / 2 + 0.5)
        half_height = int((end_size - height) / 2 + 0.5)

    minx = minx - half_width
    maxx = maxx + half_width
    miny = miny - half_height
    maxy = maxy + half_height
    z = maxz - minz + 1
    end_z = z * BUFFER_FACTOR
    half_z = int((end_z - z) / 2 + 0.5)
    minz = minz - half_z
    maxz = maxz + half_z

    if minx < 0:
        maxx = maxx - minx
        minx = 0
    if miny < 0:
        maxy = maxy - miny
        miny = 0
    if maxx > xrange:
        minx = minx - (maxx - xrange)
        maxx = xrange
    if maxy > yrange:
        miny = miny - (maxy - yrange)
        maxy = yrange
    minz = minz if minz >= 0 else 0
    maxz = maxz if maxz <= zrange else zrange
    # make sure to send at least 3 slices
    if maxz - minz < 2:
        if minz > 0:
            minz -= 1
        else:
            maxz += 1

    return minx, maxx, miny, maxy, minz, maxz


def _create_region_files(region_item, whole_item):
    """
    extract region files from the whole subvolume item based on bounding box extent and
    save files to region item
    :param region_item: region item with files to be updated
    :param whole_item: whole subvolume item to extract region files
    :return:
    """
    files = File().find({'itemId': region_item['_id']})
    # if the region already has files, existing files need to be removed before adding new ones.
    for file in files:
        File().remove(file)

    item_files = File().find({'itemId': whole_item['_id']})
    region_key = region_item['meta']['region_label']
    min_x = region_item['meta']['coordinates']['x_min']
    max_x = region_item['meta']['coordinates']['x_max']
    min_y = region_item['meta']['coordinates']['y_min']
    max_y = region_item['meta']['coordinates']['y_max']
    min_z = region_item['meta']['coordinates']['z_min']
    max_z = region_item['meta']['coordinates']['z_max']
    admin_user = User().getAdmins()[0]
    for item_file in item_files:
        file_res_path = path_util.getResourcePath('file', item_file, force=True)
        tif, _ = _get_tif_file_content_and_path(item_file)
        file_name = os.path.basename(file_res_path)
        file_base_name, file_ext = os.path.splitext(file_name)
        out_dir_path = os.path.join(DATA_PATH, str(region_item['_id']))
        output_file_name = f'{file_base_name}_region_{region_key}{file_ext}'
        out_path = os.path.join(out_dir_path, output_file_name)
        if not os.path.isdir(out_dir_path):
            os.makedirs(out_dir_path)
        output_tif = TIFF.open(out_path, mode="w")
        counter = 0
        for image in tif.iter_images():
            if min_z <= counter <= max_z:
                img = np.copy(image[min_y:max_y + 1, min_x:max_x + 1])
                output_tif.write_image(img)
            if counter > max_z:
                break
            counter += 1
        assetstore_id = item_file['assetstoreId']
        _save_file(assetstore_id, region_item, out_path, admin_user, output_file_name)
    return


def _create_region(region_key, whole_item, extent_dict):
    """
    create a new region
    :param region_key: region key for the new region to be created
    :param whole_item: the subvolume whole item that contains the new region
    :param extent_dict: extent of the new region
    :return: the new region created
    """
    min_x = extent_dict['x_min']
    max_x = extent_dict['x_max']
    min_y = extent_dict['y_min']
    max_y = extent_dict['y_max']
    min_z = extent_dict['z_min']
    max_z = extent_dict['z_max']
    admin_user = User().getAdmins()[0]
    coords = whole_item['meta']['coordinates']
    x_range = coords["x_max"] - coords["x_min"]
    y_range = coords["y_max"] - coords["y_min"]
    z_range = coords["z_max"] - coords["z_min"]
    min_x, max_x, min_y, max_y, min_z, max_z = _get_buffered_extent(
        min_x, max_x, min_y, max_y, min_z, max_z, x_range, y_range, z_range)
    folder_id = whole_item['folderId']
    region_item = Item().createItem(
        f'region{region_key}',
        creator=admin_user,
        folder=Folder().findOne({'_id': folder_id}),
        description=f'region{region_key} of the subvolume partition')

    add_meta = {
        'coordinates': {
            "x_max": max_x,
            "x_min": min_x,
            "y_max": max_y,
            "y_min": min_y,
            "z_max": max_z,
            "z_min": min_z
        },
        'region_label': region_key
    }
    Item().setMetadata(region_item, add_meta)

    _create_region_files(region_item, whole_item, extent_dict)

    return region_item


def _update_region_in_whole_item(whole_item, region_imarray, region_item_coords):
    """
    update subvolume whole item mask with updated verified region mask
    :param whole_item: subvolume whole item to update
    :param region_imarray: region image array to update whole item with
    :param region_item_coords: coordinate of region item in the subvolume whole item
    :return:
    """
    item_files = File().find({'itemId': whole_item['_id']})

    for item_file in item_files:
        if '_masks' not in item_file['name']:
            continue
        whole_tif, whole_path = _get_tif_file_content_and_path(item_file)
        output_path = f'output_{whole_path}'
        whole_out_tif = TIFF.open(output_path, mode='w')
        counter = 0
        # region_imarray should be in order of ZYX
        for image in whole_tif.iter_images():
            if region_item_coords['z_min'] <= counter <= region_item_coords['z_max']:
                image[region_item_coords['y_min']: region_item_coords['y_max'],
                      region_item_coords['x_min']: region_item_coords['x_max']] = \
                    region_imarray[counter::]
            whole_out_tif.write_image(image)
            counter += 1
        # update mask file by copying new tiff file to the old one, then delete the new tiff file
        shutil.move(output_path, whole_path)
    return


def remove_regions(region_list, whole_item):
    """
    remove all regions in region_list
    :param region_list: list of all region ids to be removed
    :param whole_item: whole subvolume item to remove regions from
    :return:
    """
    if 'removed_region_ids' in whole_item['meta'] and whole_item['meta']['removed_region_ids']:
        whole_item['meta']['removed_region_ids'].extend(region_list)
    else:
        whole_item['meta']['removed_region_ids'] = region_list

    item_list = [Item().findOne({'_id': ObjectId(rid)}) for rid in region_list]

    # delete all the other regions in region_list to be merged
    for i, rid in enumerate(region_list):
        Item().remove(item_list[i])
        del whole_item['meta']['regions'][str(rid)]

    return


def check_subvolume_done(whole_item, task='annotation'):
    """
    check if task is done for all regions in the subvolume
    :param whole_item: subvolume item
    :param task: annotation or review with annotation as default
    :return: True or False indicating whether all regions in the subvolume are all done or not
    """
    vol_done = True
    for key, val in whole_item['meta']['regions'].items():
        if f'{task}_completed_by' not in val:
            vol_done = False
            break

    if vol_done:
        add_meta = {f'{task}_done': 'true'}
        Item().setMetadata(whole_item, add_meta)
        Item().save(whole_item)
    return vol_done


def add_meta_to_region(item, label, key, val):
    """
    add meta to region item with val added as a list so that if key already exists, val is
    appended to the existing value list
    :param item: item to add metadata to
    :param label: region label
    :param key: key to add as metadata
    :param val: value to add corresponding to key as key-value metadata
    :return:
    """
    if key not in item['meta']['regions'][label]:
        item['meta']['regions'][label][key] = [val]
    else:
        item['meta']['regions'][label][key].append(val)
    Item().save(item)
    return


def reject_assignment(user, item, whole_item, has_files, comment, task='annotation'):
    """
    reject the item assignment by the user
    :param user: requesting user
    :param item: item to be rejected
    :param whole_item: whole subvolume item that includes the item to be rejected
    :param has_files: whether rejected item has files or not
    :param comment: rejection comment to be added as metadata
    :param task: "annotation" or "review" which is optional with default being annotation.
    :return:
    """
    # reject the task
    Item().deleteMetadata(whole_item, [str(user['_id'])])
    region_label = str(item['meta']['region_label'])
    # remove the user's assignment
    del whole_item['meta']['regions'][region_label][f"{task}_assigned_to"]
    uname = user["login"]
    if task == 'annotation' and has_files:
        files = File().find({'itemId': item['_id']})
        for file in files:
            if file['name'].endswith(f'{uname}.tif'):
                File().remove(file)
                break

    reject_info = {
        'user': uname,
        'timestamp': datetime.now().strftime("%m/%d/%Y %H:%M")
    }
    if comment:
        reject_info['comment'] = comment
    add_meta_to_region(whole_item, region_label, f'{task}_rejected_by', reject_info)
    return


def _set_assignment_meta(whole_item, user, region_key, region_item_id, review=False):
    if review:
        val_key = 'review_assigned_to'
    else:
        val_key = 'annotation_assigned_to'
    val = whole_item['meta']['regions'][region_key]
    val[val_key] = f'{user["login"]} at {datetime.now().strftime("%m/%d/%Y %H:%M")}'
    # since a user can claim another region, user id metadata on whole_item is a list
    user_id = str(user['_id'])
    if user_id in whole_item['meta']:
        add_meta = {user_id: whole_item['meta'][str(user['_id'])].append(region_item_id)}
    else:
        add_meta = {user_id: [region_item_id]}
    Item().setMetadata(whole_item, add_meta)


def assign_region_to_user(whole_item, user, region_key):
    """
    assign the region_key to the user, which could already own a region and wants to claim
    more neighboring regions
    :param whole_item: whole subvolume item that contains the region
    :param user: requesting user
    :param region_key: region label to be assigned to the user
    :return: assigned region item
    """
    val = whole_item['meta']['regions'][region_key]
    region_item = Item().findOne({'folderId': whole_item['folderId'],
                                  'name': f'region{region_key}'})
    if not region_item:
        region_item = _create_region(region_key, whole_item,
                                    {
                                        'x_min': val['x_min'],
                                        'x_max': val['x_max'],
                                        'y_min': val['y_min'],
                                        'y_max': val['y_max'],
                                        'z_min': val['z_min'],
                                        'z_max': val['z_max']
                                    })
    val['item_id'] = region_item['_id']
    _set_assignment_meta(whole_item, user, region_key, str(region_item['_id']))

    return region_item


def _get_added_region_metadata(whole_item, added_region_id):
    # check if the region id is part of the added region by split
    reg_items = Item().find({'folderId': whole_item['folderId']})
    for reg_item in reg_items:
        if reg_item['name'] == 'whole':
            continue
        if 'added_region_ids' in reg_item['meta'] and added_region_id in \
            reg_item['meta']['added_region_ids']:
            return whole_item['meta']['regions'][reg_item['meta']['region_label']]
    return None


def claim_assignment(user, subvolume_id, claim_region_id):
    """
    allow a user to claim a neighboring region to add to their assignment
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the claimed region
    :param claim_region_id: region id or label to find the assignment item to be claimed
    :return: a dict with status and assigned_user_info keys
    """
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    claim_region_id = str(claim_region_id)
    val = None
    if claim_region_id in whole_item['meta']['regions']:
        val = whole_item['meta']['regions'][claim_region_id]
    else:
        # check if the region id is part of the added region by split
        val = _get_added_region_metadata(whole_item, claim_region_id)

    if not val:
        ret_dict['status'] = 'failure'
        ret_dict['assigned_user_info'] = ''
        ret_dict['assigned_item_id'] = ''
        return ret_dict

    done_key = 'annotation_completed_by'
    if done_key in val:
        ret_dict['status'] = 'failure'
        ret_dict['assigned_user_info'] = val[done_key]
        ret_dict['assigned_item_id'] = val['item_id']
        return ret_dict

    if 'annotation_assigned_to' in val:
        ret_dict['status'] = 'failure'
        ret_dict['assigned_user_info'] = val['annotation_assigned_to']
        ret_dict['assigned_item_id'] = val['item_id']
        return ret_dict

    # available to be claimed, assign it to the user
    assign_region_to_user(whole_item, user, claim_region_id)
    # update assignment item coordinates metadata to include the claimed region
    assigned_item_id = whole_item['meta'][str(user['_id'])][0]
    assigned_item = Item().findOne({'_id': ObjectId(assigned_item_id)})
    claim_reg_item = Item().findOne({'_id': ObjectId(val['item_id'])})
    assigned_item['meta']['coordinates'] = {
        'z_min': min(assigned_item['meta']['coordinates']['z_min'],
                     claim_reg_item['meta']['coordinates']['z_min']),
        'z_max': max(assigned_item['meta']['coordinates']['z_max'],
                     claim_reg_item['meta']['coordinates']['z_max']),
        'y_min': min(assigned_item['meta']['coordinates']['y_min'],
                     claim_reg_item['meta']['coordinates']['y_min']),
        'y_max': max(assigned_item['meta']['coordinates']['y_max'],
                     claim_reg_item['meta']['coordinates']['y_max']),
        'x_min': min(assigned_item['meta']['coordinates']['x_min'],
                     claim_reg_item['meta']['coordinates']['x_min']),
        'x_max': max(assigned_item['meta']['coordinates']['x_max'],
                     claim_reg_item['meta']['coordinates']['x_max'])
    }
    Item().save(assigned_item)
    ret_dict['status'] = 'success'
    ret_dict['assigned_user_info'] = val['annotation_assigned_to']
    ret_dict['assigned_item_id'] = assigned_item_id
    return ret_dict


def request_assignment(user, subvolume_id, region_id):
    """
    allow a user to request an assignment for annotation or review
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the requested region
    :param region_id: requesting region id
    :return: a dict indicating success or failure
    """
    region_id_str = str(region_id)
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    if region_id_str in whole_item['meta']['regions']:
        val = whole_item['meta']['regions'][region_id_str]
        annot_done_key = 'annotation_completed_by'
        review_done_key = 'review_completed_by'
        if annot_done_key in val and review_done_key in val:
            ret_dict['status'] = 'failure'
            ret_dict['annotation_user_info'] = val[annot_done_key]
            ret_dict['review_user_info'] = val[review_done_key]
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict

        if annot_done_key:
            # annotation is done, ready for review
            # assign this item for review
            _set_assignment_meta(whole_item, user, region_id_str, val['item_id'], review=True)
            ret_dict['status'] = 'success'
            ret_dict['annotation_user_info'] = val[annot_done_key]
            ret_dict['review_user_info'] = val['review_assigned_to']
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict
        if 'annotation_assigned_to' in val:
            ret_dict['status'] = 'failure'
            ret_dict['assigned_user_info'] = val['annotation_assigned_to']
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict

        # available to be assigned
        assign_item = assign_region_to_user(whole_item, user, region_id_str)
        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = val['annotation_assigned_to']
        ret_dict['assigned_item_id'] = assign_item['_id']
        return ret_dict
    else:
        # check if the region id is part of the added region by split
        val = _get_added_region_metadata(whole_item, region_id)
        if val:
            ret_dict['status'] = 'success'
            ret_dict['assigned_user_info'] = val['annotation_assigned_to']
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict
        else:
            ret_dict['status'] = 'failure'
            ret_dict['assigned_user_info'] = ''
            ret_dict['assigned_item_id'] = ''
            return ret_dict


def get_item_assignment(user, subvolume_id):
    """
    get region assignment in a subvolume for annotation task
    :param user: requesting user to get assignment for
    :param subvolume_id: requesting subvolume id
    :return: assigned region id and label or empty if no assignment is available
    """
    if user['login'] == 'admin':
        return {
            'user_id': user['_id'],
            'item_id': ''
            }
    done_key = 'annotation_completed_by'
    if not subvolume_id:
        subvolume_ids = get_subvolume_item_ids()
        subvolume_id = subvolume_ids[0]['id']
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    if done_key in whole_item['meta'] and whole_item['meta'][done_key] == 'true':
        # if the subvolume is done, return empty assignment
        return {
            'user_id': user['_id'],
            'item_id': '',
            'region_label': ''
        }

    # when a region is selected, the user id is added to whole item meta as a key with a value of
    # item id for easy check whether a region is checked out by the user
    # check whether a region has already been assigned to the user
    if str(user['_id']) in whole_item['meta']:
        # there is already a region checked out by this user, return it
        it_id = whole_item['meta'][str(user['_id'])][0]
        it = Item().findOne({'_id': ObjectId(it_id)})
        return {
            'user_id': user['_id'],
            'item_id': it_id,
            'region_label': it['meta']['region_label']
        }
    assigned_region_label = ''
    assigned_region_id = None
    # no region has been assigned to the user yet, look into the whole partition
    # item to find a region for assignment
    for key, val in whole_item['meta']['regions'].items():
        if done_key in val:
            # if a region is done, continue to check another region
            continue
        # if a region is rejected by the user, continue to check another region
        if 'annotation_rejected_by' in val:
            for reject_dict in val['annotation_rejected_by']:
                if reject_dict['user'] == str(user['login']):
                    continue

        if 'annotation_assigned_to' not in val:
            # this region can be assigned to a user
            region_item = assign_region_to_user(whole_item, user, key)
            assigned_region_id = region_item['_id']
            assigned_region_label = region_item['meta']['region_label']
            break

    if assigned_region_id:
        return {
            'user_id': user['_id'],
            'item_id': assigned_region_id,
            'region_label': assigned_region_label
        }
    else:
        # there is no item left to assign to this user
        return {
            'user_id': user['_id'],
            'item_id': '',
            'region_label': ''
        }


def save_user_annotation_as_item(user, item_id, done, reject, comment, added_region_ids,
                                 removed_region_ids, content_data):
    """
    Save user annotation to item item_id
    :param user: user object who saves annotation
    :param item_id: item the annotation is saved to
    :param done: whether annotation is done or only an intermediate save
    :param reject: whether to reject the annotation rather than save it.
    :param comment: annotation comment from the user
    :param added_region_ids: list of region ids to be added as part of the save action
    :param removed_region_ids: list of region ids to be removed as part of the save action
    :param content_data: annotation content blob to be saved on server
    :return: success or failure
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

    done_key = f'annotation_done'
    if done:
        add_meta = {done_key: 'true'}
    else:
        add_meta = {done_key: 'false'}

    if comment:
        add_meta[f'annotation_comment'] = comment

    if added_region_ids:
        add_meta['added_region_ids'] = added_region_ids
    if removed_region_ids:
        add_meta['removed_region_ids'] = removed_region_ids

    Item().setMetadata(item, add_meta)

    files = File().find({'itemId': ObjectId(item_id)})
    annot_file_name = ''
    assetstore_id = ''
    for file in files:
        if '_masks' in file['name']:
            mask_file_name = file['name']
            annot_file_name = f'{os.path.splitext(mask_file_name)[0]}_{uname}.tif'
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
        with open(out_path, "wb") as f:
            f.write(content)
        file = _save_file(assetstore_id, item, out_path, user, annot_file_name)
    except Exception as e:
        raise RestException(f'failure: {e}', 500)

    if done:
        if added_region_ids:
            for id in added_region_ids:
                reg_item = Item().findOne({'_id': ObjectId(id)})
                # remove the item now that it has been added into the assignment item
                Item().remove(reg_item)
                # remove the corresponding region in subvolume whole item since it is added
                # into the assignment item
                del whole_item['meta']['regions'][str(id)]

        if removed_region_ids:
            remove_regions(removed_region_ids, whole_item)
            del item['meta']['removed_region_ids']

        del whole_item['meta'][str(uid)]
        whole_item = Item().save(whole_item)
        region_key = item['meta']['region_label']
        info = {
            'user': uname,
            'timestamp': datetime.now().strftime("%m/%d/%Y %H:%M")
        }
        add_meta_to_region(whole_item, region_key, 'annotation_completed_by', info)
        # check if all regions for the partition is done, and if so add done metadata to whole item
        check_subvolume_done(whole_item)

    return {
        'annotation_file_id': file['_id'],
        'status': 'success'
    }


def save_user_review_result_as_item(user, item_id, reject, comment, approve):
    """
    save user review result
    :param user: the review user
    :param item_id: assignment item id to save review result for
    :param reject: whether to reject the review assignment rather than save it.
    :param comment: review comment added by the user
    :param approve: whether to approve the annotation or not
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

    add_meta = {'review_done': 'true'}

    if comment:
        add_meta[f'review_comment'] = comment

    Item().setMetadata(item, add_meta)

    del whole_item['meta'][str(uid)]
    whole_item = Item().save(whole_item)
    region_key = item['meta']['region_label']
    info = {
        'user': uname,
        'timestamp': datetime.now().strftime("%m/%d/%Y %H:%M")
    }
    add_meta_to_region(whole_item, region_key, 'review_completed_by', info)
    # check if all regions for the partition is done, and if so add done metadata to whole item
    check_subvolume_done(whole_item, task='review')

    return {
        'status': 'success'
    }


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
                _set_max_region_id(whole_item)
                ret_data.append({
                    'id': whole_item['_id'],
                    'parent_id': folder['_id']
                })

    return ret_data


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
    }
    annot_done_key = 'annotation_done'
    review_done_key = 'review_done'
    annot_done = False
    review_done = False
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

    total_regions_done = 0
    total_regions_at_work = 0
    regions_rejected = []
    annot_completed_key = 'annotation_completed_by'
    review_completed_key = 'review_completed_by'
    total_reviewed_regions_done = 0
    total_reviewed_regions_at_work = 0
    for key, val in region_dict.items():
        if 'annotation_rejected_by' in val:
            region_item = Item().findOne({'folderId': item['folderId'],
                                          'name': f'region{key}'})
            regions_rejected.append({
                'info': val['annotation_rejected_by'],
                'id': region_item['_id']
            })
        if not annot_done:
            if annot_completed_key in val and val[annot_completed_key] == 'true':
                total_regions_done += 1
            elif 'annotation_assigned_to' in val:
                total_regions_at_work += 1
        if not review_done:
            if review_completed_key in val and val[review_completed_key] == 'true':
                total_reviewed_regions_done += 1
            elif annot_completed_key in val and \
                    val[annot_completed_key] == 'true' and 'review_assigned_to' in val:
                # annotation is done but review is not done and a user is reviewing currently
                total_reviewed_regions_at_work += 1

    ret_dict['rejected_regions'] = regions_rejected
    if annot_done and review_done:
        return ret_dict
    if annot_done:
        # annotation is done, but review is not done
        ret_dict['total_review_completed_regions'] = total_reviewed_regions_done
        ret_dict['total_review_active_regions'] = total_reviewed_regions_at_work
        ret_dict['total_review_available_regions'] = total_regions - total_reviewed_regions_done - \
            total_reviewed_regions_at_work
        return ret_dict

    # both annotation and review are not done
    ret_dict['total_annotation_completed_regions'] = total_regions_done
    ret_dict['total_annotation_active_regions'] = total_regions_at_work
    ret_dict['total_annotation_available_regions'] = total_regions - total_regions_done - \
        total_regions_at_work
    ret_dict['total_review_completed_regions'] = total_reviewed_regions_done
    ret_dict['total_review_active_regions'] = total_reviewed_regions_at_work
    ret_dict['total_review_available_regions'] = total_regions - total_reviewed_regions_done - \
        total_reviewed_regions_at_work
    return ret_dict


def get_region_or_assignment_info(item, region_label):
    """
    get region info or assignment info if the region is part of the assignment
    :param item: subvolume item that contains the region
    :param region_label: region label number such as 1, 2, etc.
    :return: dict of region or assignment info
    """
    region_label_str = str(region_label)
    if region_label_str in item['meta']['regions']:
        region_dict = item['meta']['regions'][region_label_str]
        ret_dict = {
            'item_id': region_dict['item_id'] if 'item_id' in region_dict else '',
            'annotation_assigned_to': region_dict['annotation_assigned_to']
            if 'annotation_assigned_to' in region_dict else '',
            'annotation_completed_by': region_dict['annotation_completed_by']
            if 'annotation_completed_by' in region_dict else '',
            'annotation_rejected_by': region_dict['annotation_rejected_by']
            if 'annotation_rejected_by' in region_dict else '',
            'review_assigned_to': region_dict['review_assigned_to']
            if 'review_assigned_to' in region_dict else '',
            'review_completed_by': region_dict['review_completed_by']
            if 'review_completed_by' in region_dict else '',
            'review_rejected_by': region_dict['review_rejected_by']
            if 'review_rejected_by' in region_dict else '',
        }
    else:
        ret_dict = {
            'item_id': '',
            'annotation_assigned_to': '',
            'annotation_completed_by': '',
            'annotation_rejected_by': '',
            'review_assigned_to': '',
            'review_completed_by': '',
            'review_rejected_by': ''
        }

    if region_label_str in item['meta']['removed_region_ids']:
        ret_dict['merged'] = True
        ret_dict['split'] = False
        return ret_dict

    if region_label_str in item['meta']['regions']:
        ret_dict['merged'] = False
        ret_dict['split'] = False
        return ret_dict

    # region is added as part of split
    val = _get_added_region_metadata(item, region_label_str)
    if val:
        ret_dict['merged'] = False
        ret_dict['split'] = True
        ret_dict['item_id'] = val['item_id']
        ret_dict['annotation_assigned_to'] = val['annotation_assigned_to']
        ret_dict['annotation_completed_by'] = val['annotation_completed_by'] \
            if 'annotation_completed_by' in val else ''
        ret_dict['annotation_rejected_by'] = val['annotation_rejected_by'] \
            if 'annotation_rejected_by' in val else ''
        ret_dict['review_completed_by'] = val['review_completed_by'] \
            if 'review_completed_by' in val else ''
        return ret_dict

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
        if 'annotation_completed_by' in val and 'review_completed_by' not in val:
            avail_item_list.append({
                'id': val['item_id'],
                'annotation_completed_by': val['annotation_completed_by'],
                'annotation_rejected_by': val['annotation_rejected_by']
                if 'annotation_rejected_by' in val else '',
                'annotation_assigned_to': val['annotation_assigned_to']
            })
    return avail_item_list
