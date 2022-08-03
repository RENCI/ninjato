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
from girder.models.folder import Folder
from girder.exceptions import RestException
from girder.utility import assetstore_utilities
from girder.utility import path as path_util
from .constants import BUFFER_FACTOR, DATA_PATH


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
        if minx < 0:
            minx = 0
    if maxy > yrange:
        miny = miny - (maxy - yrange)
        maxy = yrange
        if miny < 0:
            miny = 0
    minz = minz if minz >= 0 else 0
    maxz = maxz if maxz <= zrange else zrange
    # make sure to send at least 3 slices
    if maxz - minz < 2:
        if minz > 0:
            minz -= 1
        elif maxz < zrange:
            maxz += 1

    return int(minx), int(maxx), int(miny), int(maxy), int(minz), int(maxz)


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
        output_file_name = f'{file_base_name}_regions{file_ext}'
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
        save_file(assetstore_id, region_item, out_path, admin_user, output_file_name)
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
        'regions',
        creator=admin_user,
        folder=Folder().findOne({'_id': folder_id}),
        description=f'regions of the subvolume partition')

    add_meta = {
        'coordinates': {
            "x_max": max_x,
            "x_min": min_x,
            "y_max": max_y,
            "y_min": min_y,
            "z_max": max_z,
            "z_min": min_z
        },
        'region_ids': [region_key]
    }
    Item().setMetadata(region_item, add_meta)

    _create_region_files(region_item, whole_item)

    return region_item


def _remove_assignment_from_history(item, assign_item_id, assign_key):
    assign_item_id = str(assign_item_id)
    for meta_dict in item['meta']['history'][assign_item_id]:
        if meta_dict['type'] == assign_key:
            item['meta']['history'][assign_item_id].remove(meta_dict)
            if not item['meta']['history'][assign_item_id]:
                del item['meta']['history'][assign_item_id]
            Item().save(item)
            return
    return


def update_assignment_in_whole_item(whole_item, assign_item_id):
    """
    update subvolume whole item mask with updated verified assignment mask
    :param whole_item: subvolume whole item to update
    :param assign_item_id: assignment item id to update whole subvolume mask with
    :return: True if update action succeeds; otherwise, return False
    """
    assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
    if not assign_item['meta']['region_ids']:
        # the assignment does not have any regions, so nothing to update
        return
    assign_item_coords = assign_item['meta']['coordinates']
    assign_item_files = File().find({'itemId': ObjectId(assign_item_id)})
    for assign_item_file in assign_item_files:
        if '_masks' not in assign_item_file['name']:
            continue
        assign_item_tif, _ = _get_tif_file_content_and_path(assign_item_file)
        assign_item_imarray = []
        for assign_image in assign_item_tif.iter_images():
            assign_item_imarray.append(assign_image)

        item_files = File().find({'itemId': whole_item['_id']})
        for item_file in item_files:
            if '_masks' not in item_file['name']:
                continue
            whole_tif, whole_path = _get_tif_file_content_and_path(item_file)
            output_path = f'{whole_path}_output'
            whole_out_tif = TIFF.open(output_path, mode='w')
            counter = 0
            # region_imarray should be in order of ZYX
            for image in whole_tif.iter_images():
                if assign_item_coords['z_min'] <= counter <= assign_item_coords['z_max']:
                    image[assign_item_coords['y_min']: assign_item_coords['y_max']+1,
                          assign_item_coords['x_min']: assign_item_coords['x_max']+1] = \
                        assign_item_imarray[counter]
                whole_out_tif.write_image(image)
                counter += 1
            # update mask file by copying new tiff file to the old one then delete the new tiff file
            shutil.move(output_path, whole_path)
            return

    raise RestException('Failed to update assignment annotation mask in the whole subvolume mask',
                        code=500)


def find_region_item_from_label(whole_item, region_label):
    """
    return the region from the region label in a whole item
    :param whole_item: the whole item to find the region from
    :param region_label: the region label in the whole item to find the region for
    :return: the region object
    """
    if region_label in whole_item['meta']['regions'] and \
            'item_id' in whole_item['meta']['regions'][region_label]:
        return Item().findOne({
            '_id': ObjectId(whole_item['meta']['regions'][region_label]['item_id'])
        })
    return None


def get_region_extent(whole_item, region_id):
    item_files = File().find({'itemId': whole_item['_id']})
    # compute updated range after removing the region from the user's assignment
    for item_file in item_files:
        if '_masks' not in item_file['name']:
            continue
        tif, _ = _get_tif_file_content_and_path(item_file)
        images = []
        for image in tif.iter_images():
            images.append(image)
        imarray = np.array(images)
        level_indices = np.where(imarray == region_id)
        z_min = min(level_indices[0])
        z_max = max(level_indices[0])
        y_min = min(level_indices[1])
        y_max = max(level_indices[1])
        x_min = min(level_indices[2])
        x_max = max(level_indices[2])
        # need to convert extent values to int from int64, otherwise, JSON serialization
        # will raise exception when adding metadata to item
        return {
            "x_max": int(x_max),
            "x_min": int(x_min),
            "y_max": int(y_max),
            "y_min": int(y_min),
            "z_max": int(z_max),
            "z_min": int(z_min)
        }
    return {}


def remove_regions(region_list, whole_item, assigned_item_id):
    """
    remove all regions in region_list
    :param region_list: list of all region ids to be removed
    :param whole_item: whole subvolume item to remove regions from
    :param assigned_item_id: originally assigned item id
    :return:
    """
    if 'removed_region_ids' in whole_item['meta'] and whole_item['meta']['removed_region_ids']:
        whole_item['meta']['removed_region_ids'].extend(region_list)
    else:
        whole_item['meta']['removed_region_ids'] = region_list

    whole_item['meta']['removed_region_ids'] = list(set(whole_item['meta']['removed_region_ids']))
    item_list = [find_region_item_from_label(whole_item, str(rid)) for rid in region_list]

    # delete all the other regions in region_list to be merged
    for i, rid in enumerate(region_list):
        if item_list[i]:
            if str(item_list[i]['_id']) != str(assigned_item_id):
                Item().remove(item_list[i])
                del whole_item['meta']['regions'][str(rid)]
        elif str(rid) in whole_item['meta']['regions']:
            del whole_item['meta']['regions'][str(rid)]

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
    uid = str(user['_id'])
    assign_count = len(whole_item['meta'][uid])
    if assign_count <= 1:
        Item().deleteMetadata(whole_item, [uid])
    else:
        whole_item['meta'][uid].remove(str(item['_id']))
        Item().save(whole_item)
    assign_item_id = item['_id']
    # remove the user's assignment
    _remove_assignment_from_history(whole_item, assign_item_id, f"{task}_assigned_to")
    uname = user["login"]
    if task == 'annotation' and has_files:
        files = File().find({'itemId': item['_id']})
        for file in files:
            if file['name'].endswith(f'{uname}.tif'):
                File().remove(file)
                break

    reject_info = {
        "type": f'{task}_rejected_by',
        'user': uname,
        'time': datetime.now().strftime("%m/%d/%Y %H:%M")
    }
    if comment:
        reject_info['comment'] = comment
    add_meta_to_history(whole_item, assign_item_id, reject_info)
    return


def get_assignment_status(whole_item, assign_item_id):
    assign_item_id = str(assign_item_id)
    assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
    if 'review_approved' in assign_item['meta'] and assign_item['meta']['review_approved'] == 'true':
        return 'completed'
    assign_info = get_history_info(whole_item, assign_item_id, 'annotation_assigned_to')
    complete_info = get_history_info(whole_item, assign_item_id, 'annotation_completed_by')
    if not assign_info:
        return 'inactive'
    if not complete_info:
        return 'active'
    if len(assign_info) == len(complete_info)+1:
        # assignment is reassigned to user after reviewer disapproved the annotation
        return 'active'

    review_assign_info = get_history_info(whole_item, assign_item_id, 'review_assigned_to',)
    review_complete_info = get_history_info(whole_item, assign_item_id, 'review_completed_by')
    if not review_assign_info:
        return 'awaiting review'

    if not review_complete_info:
        return 'under review'
    if len(review_assign_info) == len(review_complete_info):
        # reannotated assignment is ready to be reviewed
        return 'awaiting review'

    # annotation could be assigned to a new reviewer who has not completed reviewer yet
    return 'under review'


def save_file(as_id, item, path, user, file_name):
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


def get_max_region_id(whole_item):
    if 'max_region_id' in whole_item['meta']:
        return int(whole_item['meta']['max_region_id'])
    else:
        return set_max_region_id(whole_item)


def set_max_region_id(whole_item, max_level=None):
    if not max_level:
        max_level = len(whole_item['meta']['regions'])
    add_meta = {
        'max_region_id': max_level
    }
    Item().setMetadata(whole_item, add_meta)
    return max_level


def assign_region_to_user(whole_item, user, region_key):
    """
    assign the region_key to the user, who could already own a region and wants to claim
    more neighboring regions
    :param whole_item: whole subvolume item that contains the region
    :param user: requesting user
    :param region_key: region label to be assigned to the user
    :return: assigned region item
    """
    region_key = str(region_key)
    val = whole_item['meta']['regions'][region_key]
    region_item = None
    if 'item_id' in val:
        region_item = Item().findOne({'_id': ObjectId(val['item_id'])})
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
    val['item_id'] = str(region_item['_id'])
    set_assignment_meta(whole_item, user, region_item['_id'],
                        'annotation_assigned_to')

    return region_item


def get_history_info(whole_item, assign_item_id, in_type):
    return_info = []
    assign_item_id = str(assign_item_id)
    if 'history' in whole_item['meta'] and assign_item_id in whole_item['meta']['history']:
        for info in whole_item['meta']['history'][assign_item_id]:
            if info['type'] == in_type:
                return_info.append(info)

    return return_info


def add_meta_to_history(item, assign_item_id, info, key='history'):
    """
    add meta to whole item metadata history key with val added as a list so that
    if key already exists, val is appended to the existing value list
    :param item: whole subvolume item to add metadata to
    :param label: region label
    :param info: reject info dict to be added
    :param key: history or comment_history to store meta to
    :return:
    """
    assign_item_id = str(assign_item_id)
    if key not in item['meta']:
        item['meta'][key] = {
            assign_item_id: [info]
        }
    elif assign_item_id not in item['meta'][key]:
        item['meta'][key][assign_item_id] = [info]
    else:
        key_val = item['meta'][key][assign_item_id]
        key_val.append(info)
        item['meta'][key][assign_item_id] = key_val

    Item().save(item)
    return


def check_subvolume_done(whole_item, task='annotation'):
    """
    check if task is done for all regions in the subvolume
    :param whole_item: subvolume item
    :param task: annotation or review with annotation as default
    :return: True or False indicating whether all regions in the subvolume are all done or not
    """
    vol_done = True
    vol_approved = False
    if task == 'review':
        vol_approved = True
    for key, val in whole_item['meta']['regions'].items():
        complete_info = get_history_info(whole_item, key, f'{task}_completed_by')
        if not complete_info:
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


def remove_region_from_active_assignment(whole_item, assign_item, region_id):
    """
    remove a region from a user's active assignment
    :param whole_item: whole subvolume item
    :param assign_item: a user's active assignment item
    :param region_id: region id/label to be removed from the active assignment
    :return: assignment item id
    """
    region_id = str(region_id)
    if 'removed_region_ids' in assign_item['meta']:
        rid_list = assign_item['meta']['removed_region_ids']
        if region_id in rid_list:
            rid_list.remove(region_id)
            if rid_list:
                assign_item['meta']['removed_region_ids'] = rid_list
            else:
                del assign_item['meta']['removed_region_ids']
            Item().save(assign_item)
            return assign_item['_id']

    region_levels = assign_item['meta']['region_ids']
    if region_levels:
        if region_id in region_levels:
            region_levels.remove(region_id)
            assign_item['meta']['region_ids'] = region_levels
        else:
            # nothing to remove
            return assign_item['_id']
    else:
        # removed region is not in the assignment, so nothing to remove, return success
        return assign_item['_id']

    item_files = File().find({'itemId': whole_item['_id']})
    # compute updated range after removing the region from the user's assignment
    for item_file in item_files:
        if '_masks' not in item_file['name']:
            continue
        tif, _ = _get_tif_file_content_and_path(item_file)
        images = []
        for image in tif.iter_images():
            images.append(image)
        imarray = np.array(images)
        levels = imarray[np.nonzero(imarray)]
        min_level = min(levels)
        max_level = max(levels)
        min_z_ary = []
        max_z_ary = []
        min_y_ary = []
        max_y_ary = []
        min_x_ary = []
        max_x_ary = []
        # find the range after the region is removed from the assigned item
        x_range, y_range, z_range = _get_range(whole_item)
        for lev in range(min_level, max_level + 1):
            if str(lev) not in region_levels:
                continue
            level_indices = np.where(imarray == lev)
            min_z = min(level_indices[0])
            max_z = max(level_indices[0])
            min_y = min(level_indices[1])
            max_y = max(level_indices[1])
            min_x = min(level_indices[2])
            max_x = max(level_indices[2])
            min_x, max_x, min_y, max_y, min_z, max_z = _get_buffered_extent(
                min_x, max_x, min_y, max_y, min_z, max_z, x_range, y_range, z_range)
            min_z_ary.append(min_z)
            max_z_ary.append(max_z)
            min_y_ary.append(min_y)
            max_y_ary.append(max_y)
            min_x_ary.append(min_x)
            max_x_ary.append(max_x)

        if min_z_ary:
            min_z = min(min_z_ary)
            max_z = max(max_z_ary)
            min_y = min(min_y_ary)
            max_y = max(max_y_ary)
            min_x = min(min_x_ary)
            max_x = max(max_x_ary)
            assign_item['meta']['coordinates'] = {
                "x_max": max_x,
                "x_min": min_x,
                "y_max": max_y,
                "y_min": min_y,
                "z_max": max_z,
                "z_min": min_z
            }

        assign_item = Item().save(assign_item)
        # update assign_item based on updated extent that has region removed
        if min_z_ary:
            _create_region_files(assign_item, whole_item)

        return assign_item['_id']

    return assign_item['_id']


def merge_region_to_active_assignment(whole_item, active_assign_id, region_id):
    """
    merge a region into a user's active assignment
    :param whole_item: whole subvolume item
    :param active_assign_id: a user's active assignment item id
    :param region_id: region id/label to be added into the active assignment
    :return: active assignment annotation assigned to info
    """
    region_id = str(region_id)
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

    region_ids = assign_item['meta']['region_ids']
    region_ids.append(region_id)
    assign_item['meta']['region_ids'] = region_ids
    Item().save(assign_item)
    val['item_id'] = str(assign_item['_id'])
    Item().save(whole_item)
    # update assign_item based on updated extent that includes claimed region
    _create_region_files(assign_item, whole_item)

    return get_history_info(whole_item, assign_item['_id'],
                            'annotation_assigned_to')


def set_assignment_meta(whole_item, user, region_item_id, assign_type):
    region_item_id = str(region_item_id)
    assign_info = {
        "type": assign_type,
        'user': user["login"],
        'time': datetime.now().strftime("%m/%d/%Y %H:%M")
    }
    add_meta_to_history(whole_item, region_item_id, assign_info)
    # since a user can claim another region, user id metadata on whole_item is a list
    user_id = str(user['_id'])
    if user_id in whole_item['meta']:
        item_list = whole_item['meta'][str(user['_id'])]
        if region_item_id not in item_list:
            item_list.append(region_item_id)
        add_meta = {user_id: item_list}
    else:
        add_meta = {user_id: [region_item_id]}
    Item().setMetadata(whole_item, add_meta)

    return assign_info
