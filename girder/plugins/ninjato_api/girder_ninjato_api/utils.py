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


def get_item_assignment(user, flag):
    if user['login'] == 'admin':
        return {
            'user_id': user['_id'],
            'item_id': ''
            }
    coll = Collection().findOne({'name': COLLECTION_NAME})
    vol_folders = Folder().find({
        'parentId': coll['_id'],
        'parentCollection': 'collection'
    })

    # when a region is selected, the user id is added to whole item meta specific region values
    # with a user key, and the user id is added to whole item meta as a key with a value of item id
    # for easy check whether a region is checked out by the user
    # check whether a region has already been assigned to the user
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

                if 'done' in whole_item['meta'] and whole_item['meta']['done'] == 'true':
                    # if an item is done, continue to check another folder
                    continue
                if str(user['_id']) in whole_item['meta']:
                    # there is already a region checked out by this user, return it
                    it_id = whole_item['meta'][str(user['_id'])]
                    it = Item().findOne({'folderId': ObjectId(folder['_id']),
                                         '_id': ObjectId(it_id)})
                    return {
                        'user_id': user['_id'],
                        'item_id': it_id,
                        'region_label': it['meta']['region_label']
                    }

    # no region has been assigned to the user yet, look into the whole partition
    # item to find a region for assignment
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
                                             'name': 'whole'})

                if 'done' in whole_item['meta'] and whole_item['meta']['done'] == 'true':
                    # if an item is done, continue to check another folder
                    continue

                coords = whole_item['meta']['coordinates']
                x_range = coords["x_max"] - coords["x_min"]
                y_range = coords["y_max"] - coords["y_min"]
                z_range = coords["z_max"] - coords["z_min"]
                # look into regions of this whole item for assignment
                for key, val in whole_item['meta']['regions'].items():
                    if 'done' in val and val['done'] == 'true':
                        continue
                    if 'rejected_by' in val and val['rejected_by'].split()[0] == str(user['login']):
                        continue
                    if flag and val['flag'] == flag:
                        # request a flagged region and this flagged region
                        pass
                    if 'user' not in val:
                        # this region can be assigned to a user
                        val['user'] = user['_id']
                        val['assigned_to'] = f'{user["login"]} at ' \
                                             f'{datetime.now().strftime("%m/%d/%Y %H:%M")}'
                        if 'rejected_by' in val:
                            # no need to create an item for this selected region since it already
                            # exists
                            region_item = Item().findOne({'folderId': ObjectId(folder['_id']),
                                                          'name': f'region{key}'})
                            add_meta = {'user': user['_id']}
                            Item().setMetadata(region_item, add_meta)
                        else:
                            # create an item for this selected region
                            min_x, max_x, min_y, max_y, min_z, max_z = get_buffered_extent(
                                val['x_min'], val['x_max'], val['y_min'], val['y_max'],
                                val['z_min'], val['z_max'], x_range, y_range, z_range
                            )
                            admin_user = User().getAdmins()[0]
                            region_item = Item().createItem(
                                f'region{key}',
                                creator=admin_user,
                                folder=folder,
                                description=f'region{key} of the partition')
                            val['item_id'] = region_item['_id']
                            item_files = File().find({'itemId': whole_item['_id']})
                            for item_file in item_files:
                                file_res_path = path_util.getResourcePath('file',
                                                                          item_file,
                                                                          force=True)
                                file = File().load(item_file['_id'], force=True)
                                file_path = File().getLocalFilePath(file)
                                assetstore_id = item_file['assetstoreId']
                                tif = TIFF.open(file_path, mode="r")
                                file_name = os.path.basename(file_res_path)
                                file_base_name, file_ext = os.path.splitext(file_name)
                                out_dir_path = os.path.join(DATA_PATH, str(region_item['_id']))
                                out_path = os.path.join(out_dir_path,
                                                        f'{file_base_name}_region_{key}{file_ext}')
                                if not os.path.isdir(out_dir_path):
                                    os.makedirs(out_dir_path)

                                output_tif = TIFF.open(out_path, mode="w")
                                counter = 0
                                for image in tif.iter_images():
                                    if counter >= min_z and counter <= max_z:
                                        img = np.copy(image[min_y:max_y + 1, min_x:max_x + 1])
                                        output_tif.write_image(img)
                                    if counter > max_z:
                                        break
                                    counter += 1
                                save_file(assetstore_id, region_item, out_path, admin_user,
                                          f'{file_base_name}_region_{key}{file_ext}')
                                add_meta = {
                                    'coordinates': {
                                        "x_max": max_x,
                                        "x_min": min_x,
                                        "y_max": max_y,
                                        "y_min": min_y,
                                        "z_max": max_z,
                                        "z_min": min_z
                                    },
                                    'user': user['_id'],
                                    'region_label': key
                                }
                                Item().setMetadata(region_item, add_meta)

                        add_meta = {str(user['_id']): str(region_item['_id'])}
                        Item().setMetadata(whole_item, add_meta)
                        return {
                            'user_id': user['_id'],
                            'item_id': region_item['_id'],
                            'region_label': key
                        }

    # there is no item left to assign to this user
    return {
        'user_id': user['_id'],
        'item_id': ''
    }


def save_user_annotation_as_item(user, item_id, done, reject, comment, content_data):
    """
    Save user annotation to item with item_id
    :param user: user object who saves annotation
    :param item_id: item the annotation is saved to
    :param done: whether annotation is done or only an intermediate save
    :param reject: whether to reject the annotation rather than save it.
    :param comment: annotation comment from the user
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
        Item().deleteMetadata(item, ['user'])
        Item().deleteMetadata(whole_item, [str(uid)])
        region_label = item['meta']['region_label']
        # remove the user's assignment
        del whole_item['meta']['regions'][region_label]["user"]
        files = File().find({'itemId': ObjectId(item_id)})
        for file in files:
            if file['name'].endswith(f'{uname}.tif'):
                File().remove(file)
                break
        whole_item['meta']['regions'][region_label]['rejected_by'] = \
            f'{uname} at {datetime.now().strftime("%m/%d/%Y %H:%M")}'
        if comment:
            whole_item['meta']['regions'][region_label]['rejected_comment'] = comment

        Item().save(whole_item)
        return {
            'user_id': uid,
            'item_id': item_id
        }
    if done:
        add_meta = {'done': 'true'}
        Item().setMetadata(item, add_meta)
    else:
        add_meta = {'done': 'false'}
        Item().setMetadata(item, add_meta)

    if comment:
        add_meta = {'comment': comment}
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
        partition_done = True
        for key, val in whole_item['meta']['regions'].items():
            if 'user' not in val:
                # this region is not assigned to any user yet
                partition_done = False
                break
            if 'item_id' in val and str(val['item_id']) == item_id:
                whole_item['meta']['regions'][key]['done'] = 'true'
                whole_item['meta']['regions'][key]['completed_by'] = \
                    f'{uname} at {datetime.now().strftime("%m/%d/%Y %H:%M")}'
                whole_item = Item().save(whole_item)
                continue
            if 'done' not in val or val['done'] != 'true':
                partition_done = False
                break
        if partition_done:
            add_meta = {'done': 'true'}
            Item().setMetadata(whole_item, add_meta)

    return {
        'user_id': uid,
        'item_id': item_id,
        'annotation_file_id': file['_id']
    }


def get_subvolume_item_ids():
    coll = Collection().findOne({'name': COLLECTION_NAME})
    vol_folders = Folder().find({
        'parentId': coll['_id'],
        'parentCollection': 'collection'
    })
    ret_data = {'ids': []}
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
                ret_data['ids'].append(whole_item['_id'])

    return ret_data


def get_subvolume_item_info(item):
    item_id = item['_id']
    region_dict = item['meta']['regions']
    total_regions = len(region_dict)
    total_regions_done = 0
    total_regions_at_work = 0
    regions_rejected = []
    for key, val in region_dict.items():
        if 'rejected_by' in val:
            region_item = Item().findOne({'folderId': item['folderId'],
                                          'name': f'region{key}'})
            regions_rejected.append({
                'user': val['rejected_by'].split()[0],
                'id': region_item['_id']
            })
        if 'user' in val:
            if 'done' in val and val['done'] == 'true':
                total_regions_done += 1
            else:
                total_regions_at_work += 1
    return {
        'id': item_id,
        'name': Folder().findOne({'_id': item['folderId']})['name'],
        'description': item['description'],
        'location': item['meta']['coordinates'],
        'rejected_regions': regions_rejected,
        'total_regions': total_regions,
        'total_completed_regions': total_regions_done,
        'total_active_regions': total_regions_at_work,
        'rejected_regions': regions_rejected,
        'total_available_regions': total_regions - total_regions_done - total_regions_at_work
    }


def save_region_flag(user, item_id, flag_str, comment):
    uid = user['_id']
    item = Item().findOne({'_id': ObjectId(item_id)})
    region_label = item['meta']['region_label']
    whole_item = Item().findOne({'folderId': ObjectId(item['folderId']),
                                 'name': 'whole'})
    whole_item['meta']['regions'][region_label]['flag'] = flag_str
    # remove the user's assignment
    del whole_item['meta']['regions'][region_label]["user"]
    Item().save(whole_item)

    if comment:
        add_meta = {'flag_comment': comment}
        Item().setMetadata(item, add_meta)

    return {
        'user_id': uid,
        'item_id': item_id,
        'flag': flag_str
    }
