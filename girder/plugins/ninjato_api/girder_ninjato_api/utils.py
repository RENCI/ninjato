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
        _set_max_region_id(whole_item, max_id + count - id_list_cnt)
        return id_list

    id_list = [max_id + 1 + i for i in range(count)]
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


def _get_range(whole_item):
    """
    get x, y, z range of the whole subvolume item
    :param whole_item: whole subvolume item
    :return: x_range, y_range, z_range
    """
    coords = whole_item['meta']['coordinates']
    x_range = coords["x_max"] - coords["x_min"]
    y_range = coords["y_max"] - coords["y_min"]
    z_range = coords["z_max"] - coords["z_min"]
    return x_range, y_range, z_range


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
    x_range, y_range, z_range = _get_range(whole_item)
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

    _create_region_files(region_item, whole_item)

    return region_item


def _update_assignment_in_whole_item(whole_item, assign_item_id):
    """
    update subvolume whole item mask with updated verified assignment mask
    :param whole_item: subvolume whole item to update
    :param assign_item_id: assignment item id to update whole subvolume mask with
    :return: True if update action succeeds; otherwise, return False
    """
    assign_item = Item().findOne({'_id': assign_item_id})
    assign_item_coords = assign_item['meta']['coordinates']
    assign_item_files = File().find({'itemId': assign_item_id})
    for assign_item_file in assign_item_files:
        if '_masks' not in assign_item_file['name']:
            continue
        assign_item_imarray, _ = _get_tif_file_content_and_path(assign_item_file)

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
                if assign_item_coords['z_min'] <= counter <= assign_item_coords['z_max']:
                    image[assign_item_coords['y_min']: assign_item_coords['y_max'],
                          assign_item_coords['x_min']: assign_item_coords['x_max']] = \
                        assign_item_imarray[counter::]
                whole_out_tif.write_image(image)
                counter += 1
            # update mask file by copying new tiff file to the old one, then delete the new tiff file
            shutil.move(output_path, whole_path)
            return

    raise RestException('Failed to update assignment annotation mask in the whole subvolume mask',
                        code=500)


def _remove_regions(region_list, whole_item):
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


def _remove_region_from_active_assignment(whole_item, active_assign_id, region_id):
    """
    remove a region from a user's active assignment
    :param whole_item: whole subvolume item
    :param active_assign_id: a user's active assignment item id
    :param region_id: region id/label to be removed from the active assignment
    :return: True if succeed and False otherwise
    """
    assign_item = Item().findOne({'_id': ObjectId(active_assign_id)})
    if 'added_region_ids' in assign_item['meta']:
        rid_list = assign_item['meta']['added_region_ids']
        if region_id in rid_list:
            rid_list.remove(region_id)
            assign_item['meta']['added_region_ids'] = rid_list
        elif region_id == str(assign_item['meta']['region_label']):
            raise RestException('input region id to be removed cannot be the initial '
                                'assigned region', code=400)
        else:
            raise RestException('input region id to be removed is not in the assigned regions for '
                                'the requesting user', code=400)
    elif region_id == str(assign_item['meta']['region_label']):
            raise RestException('input region id to be removed cannot be the initial '
                                'assigned region', code=400)
    else:
        raise RestException('input region id is not in the assigned regions for the requesting '
                            'user', code=400)

    assign_item_files = File().find({'itemId': ObjectId(active_assign_id)})
    # initialize min-max box values for x, y, z for subsequent range computation
    min_x = assign_item['meta']['coordinates']["x_max"]
    max_x = assign_item['meta']['coordinates']["x_min"]
    min_y = assign_item['meta']['coordinates']["y_max"]
    max_y = assign_item['meta']['coordinates']["y_min"]
    min_z = assign_item['meta']['coordinates']["z_max"]
    max_z = assign_item['meta']['coordinates']["z_min"]
    # compute updated range after removing the region from the user's assignment
    for assign_item_file in assign_item_files:
        if '_masks' not in assign_item_file['name']:
            continue
        imarray, _ = _get_tif_file_content_and_path(assign_item_file)
        levels = imarray[np.nonzero(imarray)]
        min_level = min(levels)
        max_level = max(levels)
        # find the range after the region is removed from the assigned item
        for lev in range(min_level, max_level + 1):
            if lev == int(region_id):
                continue
            level_indices = np.where(imarray == lev)
            min_z = min(min(level_indices[0]), min_z)
            max_z = max(max(level_indices[0]), max_z)
            min_y = min(min(level_indices[1]), min_y)
            max_y = max(max(level_indices[1]), max_y)
            min_x = min(min(level_indices[2]), min_x)
            max_x = max(max(level_indices[2]), max_x)

        x_range, y_range, z_range = _get_range(whole_item)
        min_x, max_x, min_y, max_y, min_z, max_z = _get_buffered_extent(
            min_x, max_x, min_y, max_y, min_z, max_z, x_range, y_range, z_range)

        assign_item['meta']['coordinates'] = {
            "x_max": max_x,
            "x_min": min_x,
            "y_max": max_y,
            "y_min": min_y,
            "z_max": max_z,
            "z_min": min_z
        }
        Item().save(assign_item)

        # update assign_item based on updated extent that has region removed
        _create_region_files(assign_item, whole_item)
        return True

    return False


def _merge_region_to_active_assignment(whole_item, active_assign_id, region_id):
    """
    merge a region into a user's active assignment
    :param whole_item: whole subvolume item
    :param active_assign_id: a user's active assignment item id
    :param region_id: region id/label to be added into the active assignment
    :return: active assignment annotation assigned to info
    """
    val = whole_item['meta']['regions'][region_id]
    assign_item = Item().findOne({'_id': ObjectId(active_assign_id)})
    # get buffered extent for the region
    min_x = val['x_min']
    max_x = val['x_max']
    min_y = val['y_min']
    max_y = val['y_max']
    min_z = val['z_min']
    max_z = val['z_max']
    x_range, y_range, z_range = _get_range(whole_item)
    min_x, max_x, min_y, max_y, min_z, max_z = _get_buffered_extent(
        min_x, max_x, min_y, max_y, min_z, max_z, x_range, y_range, z_range)
    # update assign item coordinates to include the added region
    max_x = max(max_x, assign_item['meta']['coordinates']["x_max"])
    min_x = min(min_x, assign_item['meta']['coordinates']["x_min"])
    max_y = max(max_y, assign_item['meta']['coordinates']["y_max"])
    min_y = min(min_y, assign_item['meta']['coordinates']["y_min"])
    max_z = max(max_z, assign_item['meta']['coordinates']["z_max"])
    min_z = min(min_z, assign_item['meta']['coordinates']["z_min"])
    assign_item['meta']['coordinates'] = {
        "x_max": max_x,
        "x_min": min_x,
        "y_max": max_y,
        "y_min": min_y,
        "z_max": max_z,
        "z_min": min_z
    }

    if 'added_region_ids' in assign_item['meta']:
        rid_list = assign_item['meta']['added_region_ids']
        rid_list.append(region_id)
        assign_item['meta']['added_region_ids'] = rid_list
    else:
        assign_item['meta']['added_region_ids'] = [region_id]

    Item().save(assign_item)

    if "item_id" in val:
        # remove the old region assignment item if any
        Item().remove(Item().findOne({'_id': ObjectId(val['item_id'])}))

    # update assign_item based on updated extent that includes claimed region
    _create_region_files(assign_item, whole_item)

    annot_key = 'annotation_assigned_to'
    return whole_item['meta']['regions'][assign_item['meta']['region_label']][annot_key]


def _check_subvolume_done(whole_item, task='annotation'):
    """
    check if task is done for all regions in the subvolume
    :param whole_item: subvolume item
    :param task: annotation or review with annotation as default
    :return: True or False indicating whether all regions in the subvolume are all done or not
    """
    vol_done = True
    if task == 'review':
        vol_approved = True
    for key, val in whole_item['meta']['regions'].items():
        if f'{task}_completed_by' not in val:
            vol_done = False
            if task == 'review':
                vol_approved = False
            break
        if task == 'review' and 'review_approved' in val and val['review_approved'] == 'false':
            vol_approved = False
    if vol_done:
        add_meta = {f'{task}_done': 'true'}
        if task == 'review':
            if vol_approved:
                add_meta['review_approved'] = 'true'
            else:
                add_meta['review_approved'] = 'false'
        Item().setMetadata(whole_item, add_meta)
        Item().save(whole_item)
    return vol_done


def _add_meta_to_region(item, label, key, val):
    """
    add meta to whole item metadata regions key with val added as a list so that
    if key already exists, val is appended to the existing value list
    :param item: whole subvolume item to add metadata to
    :param label: region label
    :param key: key to add as metadata
    :param val: value to add corresponding to key as key-value metadata
    :return:
    """
    if key not in item['meta']['regions'][label]:
        item['meta']['regions'][label][key] = [val]
    else:
        key_val = item['meta']['regions'][label][key]
        key_val.append(val)
        item['meta']['regions'][label][key] = key_val
    Item().save(item)
    return


def _reject_assignment(user, item, whole_item, has_files, comment, task='annotation'):
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
    uid = str(user['_id'])
    assign_count = len(whole_item['meta'][uid])
    if assign_count <= 1:
        Item().deleteMetadata(whole_item, [uid])
    else:
        whole_item['meta'][uid].remove(str(item['_id']))
        Item().save(whole_item)
    region_label = item['meta']['region_label']
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
    _add_meta_to_region(whole_item, region_label, f'{task}_rejected_by', reject_info)
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
        item_list = whole_item['meta'][str(user['_id'])]
        item_list.append(region_item_id)
        add_meta = {user_id: item_list}
    else:
        add_meta = {user_id: [region_item_id]}
    Item().setMetadata(whole_item, add_meta)


def _assign_region_to_user(whole_item, user, region_key):
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
        region_item = _create_region(str(region_key), whole_item,
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
    if region_id not in whole_item['meta']['regions']:
        raise RestException('input region id to be removed is invalid', code=400)
    else:
        val = whole_item['meta']['regions'][region_id]
        if 'annotation_assigned_to' in val:
            assign_user_login = val['annotation_assigned_to'].split()[0]
            if assign_user_login != user['login']:
                raise RestException('input region id to be removed is not currently assigned '
                                    'to the requesting user', code=400)
            ret = _remove_region_from_active_assignment(whole_item, active_assignment_id, region_id)
            if ret:
                ret_dict['status'] = 'success'
            else:
                ret_dict['status'] = 'failure'
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
        if done_key in val:
            raise RestException(f'Annotation of the claimed region has been '
                                f'completed by {val[done_key]}', code=400)

        if 'annotation_assigned_to' in val:
            assign_user_login = val['annotation_assigned_to'].split()[0]
            assigned_user = User().findOne({'login': assign_user_login})
            ret_dict['status'] = 'failure'
            ret_dict['assigned_user_info'] = val['annotation_assigned_to']
            ret_dict['assigned_user_email'] = assigned_user['email']
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict

        # available to be claimed, merge claimed region to the user's active assignment
        annot_info = _merge_region_to_active_assignment(whole_item, active_assignment_id,
                                                        claim_region_id)

        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = annot_info
        ret_dict['assigned_user_email'] = user['email']
        ret_dict['assigned_item_id'] = active_assignment_id
        return ret_dict


def request_assignment(user, subvolume_id, assignment_key):
    """
    allow a user to request an assignment for annotation or review
    :param user: requesting user
    :param subvolume_id: subvolume id that contains the requested region
    :param assignment_key: requesting assignment key which is a region id that links back to
    subvolume regions metadata
    :return: a dict indicating success or failure
    """
    region_id_str = str(assignment_key)
    ret_dict = {}
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    if region_id_str in whole_item['meta']['regions']:
        val = whole_item['meta']['regions'][region_id_str]
        annot_done_key = 'annotation_completed_by'
        review_done_key = 'review_completed_by'
        if annot_done_key in val and review_done_key in val:
            ret_dict['status'] = 'failure'
            if val['review_approved'] == 'false':
                for annot_info in val[annot_done_key]:
                    if user['login'] == annot_info['user']:
                        ret_dict['status'] = 'success'
                        break
            ret_dict['annotation_user_info'] = val[annot_done_key]
            ret_dict['review_user_info'] = val[review_done_key]
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict

        if annot_done_key in val:
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
        assign_item = _assign_region_to_user(whole_item, user, region_id_str)
        ret_dict['status'] = 'success'
        ret_dict['assigned_user_info'] = val['annotation_assigned_to']
        ret_dict['assigned_item_id'] = assign_item['_id']
        return ret_dict
    else:
        # check if the region id is part of the added region by split
        val = _get_added_region_metadata(whole_item, assignment_key)
        if val:
            ret_dict['status'] = 'success'
            ret_dict['assigned_user_info'] = val['annotation_assigned_to']
            ret_dict['assigned_item_id'] = val['item_id']
            return ret_dict
        else:
            raise RestException('request assigment key is invalid')


def get_item_assignment(user, subvolume_id):
    """
    get region assignment in a subvolume for annotation task. If user has multiple active
    assignments, all active assignments will be returned. If subvolume_id is empty, all active
    assignments across all subvolumes will be returned; otherwise, only active assignments in
    the specified subvolume is returned. If user does not have any active assignment. If
    subvolume_id is empty and user does not have active assignment, empty list will be returned;
    otherwise, if subvolume_id is set, active assignment for the user in the specified volume will
    be returned or a new assignment in the specified volume will be returned if the user does not
    have active assignment.
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
    review_approved_key = 'review_approved'
    for sub_id in id_list:
        whole_item = Item().findOne({'_id': ObjectId(sub_id)})
        if uid in whole_item['meta']:
            for assign_item_id in whole_item['meta'][uid]:
                assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
                assign_key = assign_item['meta']['region_label']
                item_dict = {
                    'item_id': assign_item_id,
                    'subvolume_id': whole_item['_id'],
                    'assignment_key': assign_key
                }
                ret_data.append(item_dict)
            continue
        if review_approved_key in whole_item['meta'] and \
            whole_item['meta'][review_approved_key] == 'true':
            continue
        filtered_id_list.append(sub_id)

    if ret_data:
        # return the user's active assignments
        return ret_data

    if not ret_data and not subvolume_id:
        # the user does not have active assignment, return empty list
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
        if 'annotation_rejected_by' in val:
            is_rejected = False
            for reject_dict in val['annotation_rejected_by']:
                if reject_dict['user'] == str(user['login']):
                    is_rejected = True
            if is_rejected:
                continue

        if 'annotation_assigned_to' not in val:
            # this region can be assigned to a user
            region_item = _assign_region_to_user(whole_item, user, key)
            assigned_region_id = region_item['_id']
            assigned_region_label = region_item['meta']['region_label']
            break

    if assigned_region_id:
        item_dict = {
            'item_id': assigned_region_id,
            'subvolume_id': subvolume_id,
            'assignment_key': assigned_region_label
        }
        ret_data.append(item_dict)

    return ret_data


def get_await_review_assignment(user, subvolume_id):
    """
    get awaiting review assignments in a subvolume for annotation task if subvolume_id is set.
    Otherwise, if it is not set, all awaoting review assignments across all subvolumes will be
    returned; If user does not have any awaiting review assignments, empty list will be returned;

    :param user: requesting user to get awaiting review assignment for
    :param subvolume_id: requesting subvolume id if not empty; otherwise, all subvolumes will be
    considered
    :return: list of awaiting review assignment item id, subvolume_id, and assignment key or empty
    if no assignment is available
    """
    ret_data = []

    if user['login'] == 'admin':
        return ret_data

    id_list = []
    if not subvolume_id:
        subvolume_ids = get_subvolume_item_ids()
        for id_item in subvolume_ids:
            id_list.append(id_item['id'])
    else:
        id_list.append(subvolume_id)

    annot_done_key = 'annotation_done'
    review_done_key = 'review_done'
    review_approved_key = 'review_approved'
    for sub_id in id_list:
        whole_item = Item().findOne({'_id': ObjectId(sub_id)})
        if review_approved_key in whole_item['meta'] and \
            whole_item['meta'][review_approved_key] == 'true':
            continue

        reg_items = Item().find({'folderId': whole_item['folderId']})
        for reg_item in reg_items:
            if reg_item['name'] == 'whole':
                continue
            if annot_done_key not in reg_item['meta']:
                continue
            if reg_item['meta'][annot_done_key] != 'true':
                continue
            if review_done_key in reg_item['meta'] and reg_item['meta'][review_done_key] == 'true':
                continue
            # annotation is done but review is not done, add it to await review list
            item_dict = {
                'item_id': str(reg_item['_id']),
                'subvolume_id': sub_id,
                'assignment_key': reg_item['meta']['region_label']
            }
            ret_data.append(item_dict)

    # return the user's active assignments
    return ret_data


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
    :return: success or failure status
    """
    uid = user['_id']
    uname = user['login']
    item = Item().findOne({'_id': ObjectId(item_id)})
    whole_item = Item().findOne({'folderId': ObjectId(item['folderId']),
                                 'name': 'whole'})
    if reject:
        # reject the annotation
        _reject_assignment(user, item, whole_item, True, comment)
        return {
            "status": "success"
        }

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
            _remove_regions(removed_region_ids, whole_item)
            del item['meta']['removed_region_ids']

        del whole_item['meta'][str(uid)]
        whole_item = Item().save(whole_item)
        region_key = item['meta']['region_label']
        info = {
            'user': uname,
            'timestamp': datetime.now().strftime("%m/%d/%Y %H:%M")
        }
        _add_meta_to_region(whole_item, region_key, 'annotation_completed_by', info)
        # check if all regions for the partition is done, and if so add done metadata to whole item
        _check_subvolume_done(whole_item)

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
        _reject_assignment(user, item, whole_item, False, comment, task='review')
        return {
            "status": "success"
        }
    region_key = item['meta']['region_label']
    if not approve:
        # update user key with annotation user to get disapproved assignment back to the user
        uname = whole_item['meta']['regions'][region_key]['annotation_completed_by'][0]['user']
        annot_user = User().findOne({'login': uname})
        annot_uid = str(annot_user['_id'])
        if annot_uid in whole_item['meta']:
            item_list = whole_item['meta'][annot_uid]
            item_list.append(item_id)
            add_meta = {annot_uid: item_list}
        else:
            add_meta = {annot_uid: [item_id]}
        Item().setMetadata(whole_item, add_meta)
    else:
        # update whole volume masks with approved annotations
        _update_assignment_in_whole_item(whole_item, item_id)

    add_meta = {'review_done': 'true'}

    if comment:
        add_meta['review_comment'] = comment

    if approve:
        add_meta['review_approved'] = 'true'
    else:
        add_meta['review_approved'] = 'false'

    Item().setMetadata(item, add_meta)

    del whole_item['meta'][str(uid)]
    whole_item = Item().save(whole_item)
    info = {
        'user': uname,
        'timestamp': datetime.now().strftime("%m/%d/%Y %H:%M")
    }
    _add_meta_to_region(whole_item, region_key, 'review_completed_by', info)
    # check if all regions for the partition is done, and if so add done metadata to whole item
    _check_subvolume_done(whole_item, task='review')

    return


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
        if not review_approved:
            if review_approved_key in val and val[review_approved_key] == 'true':
                total_regions_review_approved += 1

    ret_dict['rejected_regions'] = regions_rejected
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


def get_region_or_assignment_info(item, assignment_key):
    """
    get region info or assignment info if the region is part of the assignment
    :param item: subvolume item that contains the region
    :param assignment_key: region label number such as 1, 2, etc., whick links back to regions
    metadata in its subvolume regions metadata
    :return: dict of region or assignment info
    """
    region_label_str = str(assignment_key)
    if region_label_str in item['meta']['regions']:
        region_dict = item['meta']['regions'][region_label_str]
        item_id = region_dict['item_id'] if 'item_id' in region_dict else ''
        region_item = Item().findOne({'_id': ObjectId(item_id)}) if item_id else None
        regions = [{
            'label': region_label_str
        }]
        if region_item and 'added_region_ids' in region_item['meta']:
            for rid in region_item['meta']['added_region_ids']:
                regions.append({
                    'label': rid
                })

        ret_dict = {
            'item_id': item_id,
            'name': region_item['name'] if region_item else '',
            'description': region_item['description'] if region_item else '',
            'location': region_item['meta']['coordinates'] if region_item else {},
            'last_updated_time': region_item['updated'] if region_item else '',
            'regions': regions,
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
            'name': '',
            'description': '',
            'location': {},
            'last_updated_time': '',
            'regions': [],
            'annotation_assigned_to': '',
            'annotation_completed_by': '',
            'annotation_rejected_by': '',
            'review_assigned_to': '',
            'review_completed_by': '',
            'review_rejected_by': ''
        }

    if 'removed_region_ids' in item['meta'] and \
        region_label_str in item['meta']['removed_region_ids']:
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
        reg_item = Item().findOne({'_id': ObjectId(val['item_id'])})
        ret_dict['merged'] = False
        ret_dict['split'] = True
        ret_dict['name'] = reg_item['name'],
        ret_dict['description'] = reg_item['description']
        ret_dict['location'] = reg_item['meta']['coordinates'],
        ret_dict['last_updated_time'] = reg_item['updated'],
        ret_dict['regions'] = {
            'x_max': val['x_max'],
            'x_min': val['x_min'],
            'y_max': val['y_max'],
            'y_min': val['y_min'],
            'z_max': val['z_max'],
            'z_min': val['z_min'],
            },
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
