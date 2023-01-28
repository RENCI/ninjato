import os
import uuid
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
from girder_jobs.models.job import Job


COLLECTION_NAME = 'nuclei_image_collection'
TRAINING_COLLECTION_NAME = 'nuclei_image_training_collection'
WHOLE_ITEM_NAME = '_whole'
BUFFER_FACTOR = 3
DATA_PATH = '/girder/data'
ANNOT_ASSIGN_KEY = 'annotation_assigned_to'
ANNOT_COMPLETE_KEY = 'annotation_completed_by'
REVIEW_ASSIGN_KEY = 'review_assigned_to'
REVIEW_COMPLETE_KEY = 'review_completed_by'
REVIEW_DONE_KEY = 'review_done'
REVIEW_APPROVE_KEY = 'review_approved'
ASSIGN_COUNT_FOR_REVIEW = 10


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


def create_region_files(region_item, whole_item):
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
        if not file['name'].endswith('_user.tif'):
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
    assign_key = str(region_key).zfill(len(str(whole_item['meta']['max_region_id'])))
    region_item = Item().createItem(
        f'assignment_{assign_key}',
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

    create_region_files(region_item, whole_item)

    return region_item

def update_assignment_in_whole_item(whole_item, assign_item_id, mask_file_name=None):
    """
    update subvolume whole item mask with updated verified assignment mask
    :param whole_item: subvolume whole item to update
    :param assign_item_id: assignment item id to update whole subvolume mask with
    :param mask_file_name: annotation mask file name to update assignment. If it is None,
    annotation mask file name is checked automatically
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
        if mask_file_name and assign_item_file['name'] != mask_file_name:
            continue
        assign_item_tif, _ = _get_tif_file_content_and_path(assign_item_file)
        assign_item_images = []
        for assign_image in assign_item_tif.iter_images():
            assign_item_images.append(assign_image)

        item_files = File().find({'itemId': whole_item['_id']})
        for item_file in item_files:
            if '_masks' not in item_file['name']:
                continue
            file_res_path = path_util.getResourcePath('file', item_file, force=True)
            file_name = os.path.basename(file_res_path)
            whole_tif, whole_path = _get_tif_file_content_and_path(item_file)
            out_dir_path = os.path.dirname(whole_path)
            output_path = os.path.join(out_dir_path, f'{uuid.uuid4()}_{file_name}')
            whole_out_tif = TIFF.open(output_path, mode='w')
            counter = 0
            # region_imarray should be in order of ZYX
            for image in whole_tif.iter_images():
                if assign_item_coords['z_min'] <= counter <= assign_item_coords['z_max']:
                    image[assign_item_coords['y_min']: assign_item_coords['y_max']+1,
                          assign_item_coords['x_min']: assign_item_coords['x_max']+1] = \
                        assign_item_images[counter-assign_item_coords['z_min']]
                whole_out_tif.write_image(np.copy(image))
                counter += 1

            assetstore_id = item_file['assetstoreId']
            # remove the original file and create new file using updated TIFF mask
            File().remove(item_file)
            # for some reason, the file on disk is not really removed, so double check to make
            # sure it is deleted
            if os.path.exists(whole_path):
                os.remove(whole_path)
            save_file(assetstore_id, whole_item, output_path, User().getAdmins()[0], file_name)
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


def get_region_extent(item, region_id, user_extent=True):
    is_whole_item = False
    if item['name'] == WHOLE_ITEM_NAME:
        is_whole_item = True
    item_files = File().find({'itemId': item['_id']})
    if user_extent:
        substr_to_check = '_masks_regions_user'
    else:
        substr_to_check = '_masks_regions'
    for item_file in item_files:
        if substr_to_check not in item_file['name']:
            continue
        tif, _ = _get_tif_file_content_and_path(item_file)
        images = []
        for image in tif.iter_images():
            images.append(image)
        imarray = np.array(images)
        level_indices = np.where(imarray == int(region_id))
        z_min = min(level_indices[0])
        z_max = max(level_indices[0])
        y_min = min(level_indices[1])
        y_max = max(level_indices[1])
        x_min = min(level_indices[2])
        x_max = max(level_indices[2])
        # need to convert extent values to int from int64, otherwise, JSON serialization
        # will raise exception when adding metadata to item
        return {
            "x_max": int(x_max) if is_whole_item else int(x_max)+item['meta']['coordinates']["x_min"],
            "x_min": int(x_min) if is_whole_item else int(x_min)+item['meta']['coordinates']["x_min"],
            "y_max": int(y_max) if is_whole_item else int(y_max)+item['meta']['coordinates']["y_min"],
            "y_min": int(y_min) if is_whole_item else int(y_min)+item['meta']['coordinates']["y_min"],
            "z_max": int(z_max) if is_whole_item else int(z_max)+item['meta']['coordinates']["z_min"],
            "z_min": int(z_min) if is_whole_item else int(z_min)+item['meta']['coordinates']["z_min"]
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
    uname = user["login"]
    if task == 'annotation' and has_files:
        files = File().find({'itemId': item['_id']})
        for file in files:
            if file['name'].endswith('user.tif'):
                File().remove(file)
                break

    reject_info = {
        "type": f'{task}_rejected_by',
        'user': uname,
        'time': datetime.now().strftime("%m/%d/%Y %H:%M:%S")
    }
    if comment:
        reject_info['comment'] = comment
    add_meta_to_history(whole_item, assign_item_id, reject_info)
    return


def get_assignment_status(whole_item, assign_item_id):
    assign_item_id = str(assign_item_id)
    assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
    if REVIEW_APPROVE_KEY in assign_item['meta'] and assign_item['meta'][REVIEW_APPROVE_KEY] == 'true':
        return 'completed'
    assign_info = get_history_info(whole_item, assign_item_id, ANNOT_ASSIGN_KEY)
    complete_info = get_history_info(whole_item, assign_item_id, ANNOT_COMPLETE_KEY)
    if not assign_info:
        return 'inactive'
    if not complete_info:
        return 'active'

    review_assign_info = get_history_info(whole_item, assign_item_id, REVIEW_ASSIGN_KEY)
    review_complete_info = get_history_info(whole_item, assign_item_id, REVIEW_COMPLETE_KEY)
    if not review_assign_info:
        return 'awaiting review'

    if not review_complete_info:
        return 'under review'
    if len(complete_info[0]['time']) > 16:
        complete_time = datetime.strptime(complete_info[0]['time'], "%m/%d/%Y %H:%M:%S")
    else:
        complete_time = datetime.strptime(complete_info[0]['time'], "%m/%d/%Y %H:%M")
    if len(review_complete_info[0]['time']) > 16:
        review_compl_time = datetime.strptime(review_complete_info[0]['time'], "%m/%d/%Y %H:%M:%S")
    else:
        review_compl_time = datetime.strptime(review_complete_info[0]['time'], "%m/%d/%Y %H:%M")

    if complete_time < review_compl_time:
        # assignment is reassigned to user after reviewer disapproved the annotation
        return "active"
    else:
        # assignment is annotated again, not assigned for reivew yet
        return 'awaiting review'


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
                        ANNOT_ASSIGN_KEY)

    return region_item


def get_history_info(whole_item, assign_item_id, in_type):
    return_info = []
    # in_type has to be not empty and contain _ to indicate the task type: annotation or review
    if not in_type or '_' not in in_type:
        return return_info
    assign_item_id = str(assign_item_id)
    if 'history' in whole_item['meta'] and assign_item_id in whole_item['meta']['history']:
        task = in_type.split('_')[0]
        # need to loop through history list in reverse order to check newer actions first
        for info in reversed(whole_item['meta']['history'][assign_item_id]):
            rejected_by_key = f'{task}_rejected_by'
            if info['type'] == rejected_by_key:
                if in_type == rejected_by_key:
                    return_info.append(info)
                # the assignment is rejected which will invalid previous actions
                return return_info
            if info['type'] == in_type:
                return_info.append(info)

    return return_info


def get_completed_assignment_items(username, whole_item, in_type=ANNOT_COMPLETE_KEY):
    return_info = []
    if 'history' in whole_item['meta']:
        for assign_item_id in whole_item['meta']['history']:
            # need to loop through history list in reverse order to check newer actions first
            for info in whole_item['meta']['history'][assign_item_id]:
                if info['type'] == in_type and info['user'] == username:
                    return_info.append(assign_item_id)
                    continue

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
        if REVIEW_APPROVE_KEY in val and val[REVIEW_APPROVE_KEY] == 'true':
            continue
        complete_info = get_history_info(whole_item, key, f'{task}_completed_by')
        if not complete_info:
            vol_done = False
            if task == 'review':
                vol_approved = False
            break
        if task == 'review' and REVIEW_APPROVE_KEY in val and val[REVIEW_APPROVE_KEY] == 'false':
            vol_approved = False
    if vol_done:
        add_meta = {f'{task}_done': 'true'}
        if task == 'review':
            if vol_approved:
                add_meta[REVIEW_APPROVE_KEY] = 'true'
            else:
                add_meta[REVIEW_APPROVE_KEY] = 'false'
        Item().setMetadata(whole_item, add_meta)
        Item().save(whole_item)
    return vol_done


def _update_user_mask(item_id, old_content, old_extent, new_extent=None):
    item = Item().findOne({'_id': ObjectId(item_id)})
    if not new_extent:
        item_coords = item['meta']['coordinates']
        new_extent = {
            'min_x': item_coords['x_min'],
            'max_x': item_coords['x_max'],
            'min_y': item_coords['y_min'],
            'max_y': item_coords['y_max'],
            'min_z': item_coords['z_min'],
            'max_z': item_coords['z_max']
        }
    item_files = File().find({'itemId': ObjectId(item_id)})
    item_user_mask = _reshape_content_bytes_to_array(old_content, old_extent)
    item_mask = []
    user_mask_file_name = ''
    mask_file_name = ''
    assetstore_id = ''
    for item_file in item_files:
        if '_masks' not in item_file['name']:
            continue
        if item_file['name'].endswith('_user.tif'):
            # remove the user mask before writing a new mask to it
            user_mask_file_name = item_file['name']
            File().remove(item_file)
            continue

        mask_file_name = item_file['name']
        assetstore_id = item_file['assetstoreId']
        item_tif, _ = _get_tif_file_content_and_path(item_file)
        # initial mask
        for mask in item_tif.iter_images():
            item_mask.append(mask)
    # check user mask and initial mask to combine the extent to update user mask
    z = new_extent['min_z']
    for mask in item_mask:
        if z < old_extent['min_z']:
            # not covered by user content
            z += 1
            continue
        if z > old_extent['max_z']:
            # done combining
            break
        # z is in range of old extent
        copy_extent = {
            'min_x': max(old_extent['min_x'], new_extent['min_x']),
            'max_x': min(old_extent['max_x'], new_extent['max_x']),
            'min_y': max(old_extent['min_y'], new_extent['min_y']),
            'max_y': min(old_extent['max_y'], new_extent['max_y']),
        }
        mask_min_y = copy_extent['min_y'] - new_extent['min_y']
        mask_max_y = copy_extent['max_y'] - new_extent['min_y'] + 1
        mask_min_x = copy_extent['min_x'] - new_extent['min_x']
        mask_max_x = copy_extent['max_x'] - new_extent['min_x'] + 1
        user_mask_min_y = copy_extent['min_y'] - old_extent['min_y']
        user_mask_max_y = copy_extent['max_y'] - old_extent['min_y'] + 1
        user_mask_min_x = copy_extent['min_x'] - old_extent['min_x']
        user_mask_max_x = copy_extent['max_x'] - old_extent['min_x'] + 1
        user_z = z - old_extent['min_z']
        mask[mask_min_y:mask_max_y, mask_min_x:mask_max_x] = \
            item_user_mask[user_z][user_mask_min_y:user_mask_max_y, user_mask_min_x:user_mask_max_x]
        z += 1

    if not mask_file_name:
        # nothing to update, no initial mask file
        return
    # write updated mask to user mask file
    try:
        # save file to local file system before adding it to asset store
        admin_user = User().getAdmins()[0]
        out_dir_path = os.path.join(DATA_PATH, str(item_id))
        if not user_mask_file_name:
            user_mask_file_name = f'{os.path.splitext(mask_file_name)[0]}_user.tif'
        out_path = os.path.join(out_dir_path, user_mask_file_name)
        if not os.path.isdir(out_dir_path):
            os.makedirs(out_dir_path)
        output_tif = TIFF.open(out_path, mode="w")
        for mask in item_mask:
            output_tif.write_image(mask)
        save_file(assetstore_id, item, out_path, admin_user, user_mask_file_name)
    except Exception as e:
        raise RestException(f'failure: {e}', 500)


def remove_region_from_active_assignment(whole_item, assign_item_id, region_id,
                                         active_region_ids, active_content_data):
    """
    remove a region from a user's active assignment
    :param whole_item: whole subvolume item
    :param assign_item_id: a user's active assignment item id
    :param region_id: region id/label to be removed from the active assignment
    :param active_region_ids: active assignment region id list
    :param active_content_data: active assignment mask content data
    :return: assignment item id
    """
    assign_item = Item().findOne({'_id': ObjectId(assign_item_id)})
    if active_content_data:
        # get old_extent that corresponds to active_content_data before assign_item's coordinates
        # is updated with merged region extent
        old_extent = {
            'min_x': assign_item['meta']['coordinates']['x_min'],
            'max_x': assign_item['meta']['coordinates']['x_max'],
            'min_y': assign_item['meta']['coordinates']['y_min'],
            'max_y': assign_item['meta']['coordinates']['y_max'],
            'min_z': assign_item['meta']['coordinates']['z_min'],
            'max_z': assign_item['meta']['coordinates']['z_max']
        }
    region_id = str(region_id)
    if 'item_id' in whole_item['meta']['regions'][region_id]:
        del whole_item['meta']['regions'][region_id]['item_id']
        Item().save(whole_item)

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
            create_region_files(assign_item, whole_item)
            if active_content_data:
                # merge active_content_data with updated assign item extent with claimed region included
                _update_user_mask(assign_item_id, active_content_data.file.read(), old_extent,
                                  new_extent={
                                      'min_x': min_x,
                                      'max_x': max_x,
                                      'min_y': min_y,
                                      'max_y': max_y,
                                      'min_z': min_z,
                                      'max_z': max_z
                                      })
                if active_region_ids:
                    # make sure active_region_ids does not include the removed region id
                    active_region_ids = list(map(str, active_region_ids))
                    if region_id in active_region_ids:
                        active_region_ids.remove(region_id)
                    save_added_and_removed_regions(whole_item, assign_item, active_region_ids)

        return assign_item['_id']

    return assign_item['_id']


def merge_region_to_active_assignment(whole_item, active_assign_id, region_id,
                                      active_region_ids, active_content_data):
    """
    merge a region into a user's active assignment
    :param whole_item: whole subvolume item
    :param active_assign_id: a user's active assignment item id
    :param region_id: region id/label to be added into the active assignment
    :param active_region_ids: active assignment region id list
    :param active_content_data: active assignment mask content data
    :return: active assignment annotation assigned to info
    """
    assign_item = Item().findOne({'_id': ObjectId(active_assign_id)})
    if active_content_data:
        # get old_extent that corresponds to active_content_data before assign_item's coordinates
        # is updated with merged region extent
        old_extent = {
            'min_x': assign_item['meta']['coordinates']['x_min'],
            'max_x': assign_item['meta']['coordinates']['x_max'],
            'min_y': assign_item['meta']['coordinates']['y_min'],
            'max_y': assign_item['meta']['coordinates']['y_max'],
            'min_z': assign_item['meta']['coordinates']['z_min'],
            'max_z': assign_item['meta']['coordinates']['z_max']
        }

    region_id = str(region_id)

    val = whole_item['meta']['regions'][region_id]
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
    create_region_files(assign_item, whole_item)
    if active_content_data:
        # merge active_content_data with updated assign item extent with claimed region included
        _update_user_mask(active_assign_id, active_content_data.file.read(), old_extent, new_extent={
            'min_x': min_x,
            'max_x': max_x,
            'min_y': min_y,
            'max_y': max_y,
            'min_z': min_z,
            'max_z': max_z
        })
        if active_region_ids:
            # make sure claimed region_id is part of updated region ids to check for
            # added and removed regions
            active_region_ids = list(map(str, active_region_ids))
            active_region_ids.append(region_id)
            whole_item = save_added_and_removed_regions(whole_item, assign_item,
                                                        list(set(active_region_ids)))
    return get_history_info(whole_item, assign_item['_id'], ANNOT_ASSIGN_KEY)


def add_user_active_assignment_metadata(user_id, whole_item, region_item_id):
    # since a user can claim another region, user id metadata on whole_item is a list
    if user_id in whole_item['meta']:
        item_list = whole_item['meta'][user_id]
        if region_item_id not in item_list:
            item_list.append(region_item_id)
        add_meta = {user_id: item_list}
    else:
        add_meta = {user_id: [region_item_id]}
    Item().setMetadata(whole_item, add_meta)
    Item().save(whole_item)


def set_assignment_meta(whole_item, user, region_item_id, assign_type):
    region_item_id = str(region_item_id)
    assign_info = {
        "type": assign_type,
        'user': user["login"],
        'time': datetime.now().strftime("%m/%d/%Y %H:%M:%S")
    }
    add_meta_to_history(whole_item, region_item_id, assign_info)
    user_id = str(user['_id'])
    add_user_active_assignment_metadata(user_id, whole_item, region_item_id)
    return assign_info


def _reshape_content_bytes_to_array(content, extent):
    max_x = extent['max_x']
    min_x = extent['min_x']
    max_y = extent['max_y']
    min_y = extent['min_y']
    min_z = extent['min_z']
    max_z = extent['max_z']
    width = max_x - min_x + 1
    height = max_y - min_y + 1
    contents = []
    for z in range(min_z, max_z + 1):
        low = (z - min_z) * height * width * 2
        high = low + height * width * 2
        img_ary = np.frombuffer(content[low:high], dtype=np.uint16)
        img_ary.shape = (height, width)
        contents.append(img_ary)
    return contents


def _save_content_bytes_to_tiff(content, out_file, item):
    """
    save content bytes to TIFF file
    :param content: content byte stream
    :param out_file: file name with full path to write content to
    :return:
    """
    files = File().find({'itemId': item['_id']})
    # if the region already has user file, existing file need to be removed before adding new ones.
    for file in files:
        if file['name'].endswith('_user.tif'):
            File().remove(file)

    mask_contents = _reshape_content_bytes_to_array(content, {
        'min_x': item['meta']['coordinates']['x_min'],
        'max_x': item['meta']['coordinates']['x_max'],
        'min_y': item['meta']['coordinates']['y_min'],
        'max_y': item['meta']['coordinates']['y_max'],
        'min_z': item['meta']['coordinates']['z_min'],
        'max_z': item['meta']['coordinates']['z_max']
    })
    output_tif = TIFF.open(out_file, mode="w")
    for mask in mask_contents:
        output_tif.write_image(mask)
    output_tif.close()
    return


def save_content_data(user, item_id, content_data, review=False):
    """
    Save content byte data to item
    :param user: user object to save content data to
    :param item_id: item id to get user mask file name and assetstore id from
    :param content_data: content byte data to save to the item
    :param review: indicating whether it is being reviewed by a reviewer or not
    :return: user mask file name and assetstore id
    """
    files = File().find({'itemId': ObjectId(item_id)})
    annot_file_name = ''
    assetstore_id = ''
    for file in files:
        if review:
            if '_masks' in file['name'] and file['name'].endswith('_user.tif'):
                annot_file_name = file['name']
                assetstore_id = file['assetstoreId']
                break
        elif '_masks' in file['name']:
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
        item = Item().findOne({'_id': ObjectId(item_id)})
        _save_content_bytes_to_tiff(content, out_path, item)
        save_file(assetstore_id, item, out_path, user, annot_file_name)
    except Exception as e:
        raise RestException(f'failure: {e}', 500)
    return annot_file_name


def save_added_and_removed_regions(whole_item, item, current_region_ids,
                                   done=False, uid='', add_meta={}):
    """
    save added and removed regions based on current_region_ids for item
    :param whole_item: whole subvolume item
    :param item: the item to be saved
    :param current_region_ids: current region ids for the item to derive added and removed regions
    :param done: whether the annotation is done and final
    :param uid: id of the annotation user who can be a regular user or a reviewer
    :param add_meta: the metadata dictionary to add to for the item to be saved to
    :return: updated whole_item
    """
    removed_region_ids = []
    added_region_ids = []
    if current_region_ids:
        # make sure each item is a string
        current_region_ids = [str(rid) for rid in current_region_ids]
        exist_region_ids = item['meta']['region_ids']
        if 'added_region_ids' in item['meta']:
            added_region_ids = item['meta']['added_region_ids']
            exist_region_ids = exist_region_ids + added_region_ids
        if 'removed_region_ids' in item['meta']:
            removed_region_ids = item['meta']['removed_region_ids']
            exist_region_ids = [elem for elem in exist_region_ids if elem not in removed_region_ids]

        removed_region_ids = removed_region_ids + [
            rid for rid in exist_region_ids if rid not in current_region_ids
        ]
        added_region_ids = added_region_ids + \
                           [rid for rid in current_region_ids if rid not in exist_region_ids]
        duplicate_ids = [elem for elem in added_region_ids if elem in removed_region_ids]
        if duplicate_ids:
            added_region_ids = [elem for elem in added_region_ids if elem not in duplicate_ids]
            removed_region_ids = [elem for elem in removed_region_ids if elem not in duplicate_ids]
        if added_region_ids:
            # remove potential duplicates
            added_region_ids = list(set(added_region_ids))
        if 'added_region_ids' in add_meta or added_region_ids:
            add_meta['added_region_ids'] = added_region_ids
        if 'removed_region_ids' in add_meta or removed_region_ids:
            add_meta['removed_region_ids'] = removed_region_ids
    Item().setMetadata(item, add_meta)

    if done:
        if removed_region_ids:
            remove_regions(removed_region_ids, whole_item, str(item['_id']))
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
            if str(item['_id']) in whole_item['meta'][uid]:
                whole_item['meta'][uid].remove(str(item['_id']))
            if not whole_item['meta'][uid]:
                del whole_item['meta'][uid]
        whole_item = Item().save(whole_item)
    return whole_item


def update_all_assignment_masks_async(whole_item, saved_assign_item_id):
    """
    update all assignments except for the saved_assign_item_id assignment of the whole item
    :param whole_item: the whole subvolume item
    :param saved_assign_item_id: assignment item id that already has updated masks
    :return:
    """
    job_model = Job()
    job = job_model.createLocalJob(title='update assignment files', type='local',
                                   user=User().getAdmins()[0],
                                   args=(whole_item, saved_assign_item_id),
                                   module='girder_ninjato_api.async_job_utils',
                                   function='update_all_assignment_masks')
    job_model.scheduleJob(job)
    return
