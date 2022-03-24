import os
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


def save_file(as_id, item, path, user, file_name):
    asset_store = AssetstoreModel().load(as_id)
    adapter = assetstore_utilities.getAssetstoreAdapter(asset_store)
    file = adapter.importFile(item, path, user, name=file_name, mimeType='image/tiff')
    return file


def get_items(item_id):
    """
    get item associated with item_id and the whole_item that includes the item
    :param item_id: id of the item to get
    :return: item and whole_item
    """
    item = Item().findOne({'_id': ObjectId(item_id)})
    whole_item = Item().findOne({'folderId': ObjectId(item['folderId']),
                                 'name': 'whole'})
    return item, whole_item


def get_max_region_id(whole_item):
    return whole_item['meta']['whole_region_id']


def set_max_region_id(whole_item, max_level = None):
    if not max_level:
        max_level = len(whole_item['meta']['regions'])
    add_meta = {
        'max_region_id': max_level
    }
    Item().setMetadata(whole_item, add_meta)


def get_tif_file_content_and_path(item_file):
    file = File().load(item_file['_id'], force=True)
    file_path = File().getLocalFilePath(file)
    tif = TIFF.open(file_path, mode="r")
    return tif, file_path


def get_tif_file_content_and_region_output_path(item_file, output_file_id, region_key):
    file_res_path = path_util.getResourcePath('file', item_file, force=True)
    tif, _ = get_tif_file_content_and_path(item_file)
    file_name = os.path.basename(file_res_path)
    file_base_name, file_ext = os.path.splitext(file_name)
    out_dir_path = os.path.join(DATA_PATH, str(output_file_id))
    out_path = os.path.join(out_dir_path,
                            f'{file_base_name}_region_{region_key}{file_ext}')
    if not os.path.isdir(out_dir_path):
        os.makedirs(out_dir_path)
    output_file = f'{file_base_name}_region_{region_key}{file_ext}'
    output_tif = TIFF.open(out_path, mode="w")
    return tif, out_path, output_file, output_tif


def get_buffered_extent(minx, maxx, miny, maxy, minz, maxz, xrange, yrange, zrange):
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


def create_region(region_key, whole_item, extent_dict):
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
    min_x, max_x, min_y, max_y, min_z, max_z = get_buffered_extent(
        min_x, max_x, min_y, max_y, min_z, max_z, x_range, y_range, z_range)
    folder_id = whole_item['folderId']
    region_item = Item().createItem(
        f'region{region_key}',
        creator=admin_user,
        folder=Folder().findOne({'_id': folder_id}),
        description=f'region{region_key} of the partition')

    item_files = File().find({'itemId': whole_item['_id']})
    for item_file in item_files:
        tif, out_path, output_file_name, output_tif = get_tif_file_content_and_region_output_path(
            item_file, region_item['_id'], region_key)
        counter = 0
        for image in tif.iter_images():
            if counter >= min_z and counter <= max_z:
                img = np.copy(image[min_y:max_y + 1, min_x:max_x + 1])
                output_tif.write_image(img)
            if counter > max_z:
                break
            counter += 1
        assetstore_id = item_file['assetstoreId']
        save_file(assetstore_id, region_item, out_path, admin_user, output_file_name)

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
    return region_item


def check_subvolume_done(whole_item, task='annotation'):
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
    if not key in item['meta']['regions'][label]:
        item['meta']['regions'][label][key] = [val]
    else:
        item['meta']['regions'][label][key].append(val)
    Item().save(item)
    return


def reject_assignment(user, item, whole_item, has_files, comment):
    # reject the annotation
    Item().deleteMetadata(item, ['user'])
    Item().deleteMetadata(whole_item, [str(user['_id'])])
    region_label = item['meta']['region_label']
    # remove the user's assignment
    del whole_item['meta']['regions'][region_label]["user"]
    uname = user["login"]
    if has_files:
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
    add_meta_to_region(whole_item, region_label, 'annotation_rejected_by', reject_info)
    return


def get_item_assignment(user, subvolume_id):
    if user['login'] == 'admin':
        return {
            'user_id': user['_id'],
            'item_id': ''
            }
    done_key = 'annotation_done'
    if not subvolume_id:
        subvolume_ids = get_subvolume_item_ids()
        subvolume_id = subvolume_ids['ids'][0]
    whole_item = Item().findOne({'_id': ObjectId(subvolume_id)})
    if done_key in whole_item['meta'] and whole_item['meta'][done_key] == 'true':
        # if the subvolume is done, return empty assignment
        return {
            'user_id': user['_id'],
            'item_id': ''
        }

    # when a region is selected, the user id is added to whole item meta as a key with a value of
    # item id for easy check whether a region is checked out by the user
    # check whether a region has already been assigned to the user
    if str(user['_id']) in whole_item['meta']:
        # there is already a region checked out by this user, return it
        it_id = whole_item['meta'][str(user['_id'])]
        it = Item().findOne({'folderId': ObjectId(subvolume_id),
                             '_id': ObjectId(it_id)})
        return {
            'user_id': user['_id'],
            'item_id': it_id,
            'region_label': it['meta']['region_label']
        }

    assigned_region_id = None
    next_region_id = None
    if 'next_available_region' in whole_item['meta'] and \
        whole_item['meta']['next_available_region']:
        assigned_region_id = whole_item['meta']['next_available_region']
        # clear next_available_region key
        add_meta = {'next_available_region': ''}
        Item().setMetadata(whole_item, add_meta)

    # no region has been assigned to the user yet, look into the whole partition
    # item to find a region for assignment
    for key, val in whole_item['meta']['regions'].items():
        if done_key in val and val[done_key] == 'true':
            # if a region is done, continue to check another region
            continue
        # if a region is rejected by the user, continue to check another region
        if 'rejected_by' in val:
            for reject_dict in val['rejected_by']:
                if reject_dict['user'] == str(user['login']):
                    continue

        if 'user' not in val:
            # this region can be assigned to a user
            if next_region_id:
                # already find both assigned region and next region
                break
            if 'rejected_by' in val:
                # no need to create an item for this selected region since it already
                # exists
                region_item = Item().findOne({'folderId': ObjectId(subvolume_id),
                                              'name': f'region{key}'})
            else:
                region_item = create_region(key, whole_item,
                                            {
                                                'x_min': val['x_min'],
                                                'x_max': val['x_max'],
                                                'y_min': val['y_min'],
                                                'y_max': val['y_max'],
                                                'z_min': val['z_min'],
                                                'z_max': val['z_max']
                                            })
            if not assigned_region_id:
                assigned_region_id = region_item['_id']
            else:
                next_region_id = region_item['_id']
                add_meta = {'next_available_region': str(next_region_id)}
                Item().setMetadata(whole_item, add_meta)

    if assigned_region_id:
        # assign assigned_region_id to this user
        region_item = Item().findOne({'_id': ObjectId(assigned_region_id)})
        val = whole_item['meta']['regions'][region_item['meta']['region_label']]
        val['user'] = user['_id']
        val['assigned_to'] = f'{user["login"]} at ' \
                             f'{datetime.now().strftime("%m/%d/%Y %H:%M")}'
        val['item_id'] = region_item['_id']
        add_meta = {str(user['_id']): str(region_item['_id'])}
        Item().setMetadata(whole_item, add_meta)
        add_meta = {'user': user['_id']}
        Item().setMetadata(region_item, add_meta)

        return {
            'user_id': user['_id'],
            'item_id': assigned_region_id,
            'region_label': region_item['meta']['region_label']
        }
    else:
        # there is no item left to assign to this user
        return {
            'user_id': user['_id'],
            'item_id': ''
        }


def save_user_annotation_as_item(user, item_id, done, reject, comment, action_list, content_data):
    """
    Save user annotation to item item_id
    :param user: user object who saves annotation
    :param item_id: item the annotation is saved to
    :param done: whether annotation is done or only an intermediate save
    :param reject: whether to reject the annotation rather than save it.
    :param comment: annotation comment from the user
    :param action_list: list of regions indicating annotation actions
    :param content_data: annotation content blob to be saved on server
    :return: success or failure
    """
    uid = user['_id']
    uname = user['login']
    item, whole_item = get_items(item_id)
    if reject:
        # reject the annotation
        reject_assignment(user, item, whole_item, True, comment)
        return {
            "status": "success"
        }

    done_key = f'annotation_done'
    if done:
        add_meta = {done_key: 'true'}
        Item().setMetadata(item, add_meta)
    else:
        add_meta = {done_key: 'false'}
        Item().setMetadata(item, add_meta)

    if comment:
        add_meta = {f'annotation_comment': comment}
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
        file = save_file(assetstore_id, item, out_path, user, annot_file_name)
    except Exception as e:
        raise RestException(f'failure: {e}', 500)

    if done:
        # check if all regions for the partition is done, and if so add done metadata to whole item
        del whole_item['meta'][str(uid)]
        whole_item = Item().save(whole_item)
        region_key = item['meta']['region_label']
        info = {
            'user': uname,
            'timestamp': datetime.now().strftime("%m/%d/%Y %H:%M")
        }
        add_meta_to_region(whole_item, region_key, 'annotation_completed_by', info)
        check_subvolume_done(whole_item)

    return {
        'annotation_file_id': file['_id'],
        'status': 'success'
    }


def get_subvolume_item_ids():
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
                set_max_region_id(whole_item)
                ret_data.append({
                    'id': whole_item['_id'],
                    'parent_id': folder['_id']
                })

    return ret_data


def get_subvolume_item_info(item):
    item_id = item['_id']
    region_dict = item['meta']['regions']
    total_regions = len(region_dict)
    if 'done' in item['meta'] and item['meta']['done'] == 'true':
        return {
            'item_id': item_id,
            'item_description': item['description'],
            'total_regions': total_regions,
            'total_annotation_completed_regions': total_regions,
            'total_annotation_active_regions': 0,
            'total_review_completed_regions': total_regions,
            'total_review_active_regions': 0,
            'total_annotation_available_regions': 0,
            'total_review_available_regions': 0
        }
    total_regions_done = 0
    total_regions_at_work = 0
    regions_rejected = []
    done_key = 'annotation_completed_by'
    review_done_key = 'review_completed_by'
    total_reviewed_regions_done = 0
    total_reviewed_regions_at_work = 0
    for key, val in region_dict.items():
        if 'annotation_rejected_by' in val:
            region_item = Item().findOne({'folderId': item['folderId'],
                                          'name': f'region{key}'})
            regions_rejected.append({
                'info': val['rejected_by'],
                'id': region_item['_id']
            })

        if done_key in val and val[done_key] == 'true':
            total_regions_done += 1
        elif 'user' in val:
            total_regions_at_work += 1

        if review_done_key in val and val[review_done_key] == 'true':
            total_reviewed_regions_done += 1
        elif done_key in val and val[done_key] == 'true' and 'user' in val:
            # annotation is done but review is not done and a user is reviewing currently
            total_reviewed_regions_at_work += 1

    return {
        'id': item_id,
        'name': Folder().findOne({'_id': item['folderId']})['name'],
        'description': item['description'],
        'location': item['meta']['coordinates'],
        'assignment': {
            'rejected_regions': regions_rejected,
            'total_regions': total_regions,
            'total_annotation_completed_regions': total_regions_done,
            'total_annotation_active_regions': total_regions_at_work,
            'annotation_rejected_regions': regions_rejected,
            'total_review_completed_regions': total_reviewed_regions_done,
            'total_review_active_regions': total_reviewed_regions_at_work,
            'total_annotation_available_regions': total_regions - total_regions_done -
                                                  total_regions_at_work,
            'total_review_available_regions': total_regions - total_reviewed_regions_done -
                                              total_reviewed_regions_at_work
        }
    }


def get_subvolume_next_available_region(item):
    if 'next_available_region' in item['meta']:
        return {
          'region_id': item['meta']['next_available_region']
        }
    else:
        return {'region_id': ''}


def get_subvolume_claimed_regions(item):
    claimed_regions = []
    for key, val in item['meta'].items():
        if key == 'coordinates' or key == 'regions':
            continue
        claim_user = User().findOne({'_id': ObjectId(key)})
        claim_reg = Item().findOne({'_id': ObjectId(val)})
        if claim_user and claim_reg:
            claimed_regions.append({
                'region_id': val,
                'region_label': claim_reg['meta']['region_label'],
                'user_id': key,
                'username': claim_user['login']
            })
    return claimed_regions
