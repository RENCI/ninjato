import os
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
from .constants import COLLECTION_NAME, BUFFER_X_Y_FACTOR, BUFFER_Z_ADDITION


def save_file(item, path, user, file_name):
    for asset in AssetstoreModel().list():
        asset_store_id = asset['_id']
        break
    asset_store = AssetstoreModel().load(asset_store_id)
    adapter = assetstore_utilities.getAssetstoreAdapter(asset_store)
    file = adapter.importFile(item, path, user, name=file_name, mimeType='image/tiff')
    return file


def get_buffered_extent(minx, maxx, miny, maxy, minz, maxz, xrange, yrange, zrange):
    width = (maxx - minx) * BUFFER_X_Y_FACTOR
    half_width = int(width / 2)
    height = (maxy - miny) * BUFFER_X_Y_FACTOR
    half_height = int(height / 2)

    minx = minx - half_width
    maxx = maxx + half_width
    miny = miny - half_height
    maxy = maxy + half_height
    minz = minz - BUFFER_Z_ADDITION
    maxz = maxz + BUFFER_Z_ADDITION

    minx = minx if minx >= 0 else 0
    miny = miny if miny >= 0 else 0
    minz = minz if minz >= 0 else 0
    maxx = maxx if maxx <= xrange else xrange
    maxy = maxy if maxy <= yrange else yrange
    maxz = maxz if maxz <= zrange else zrange
    return minx, maxx, miny, maxy, minz, maxz


def get_item_assignment(user):
    coll = Collection().findOne({'name': COLLECTION_NAME})
    vol_folders = Folder().find({
        'parentId': coll['_id'],
        'parentCollection': 'collection'
    })
    sel_item = None
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
                items = Item().find({'folderId': ObjectId(folder['_id'])})
                for item in items:
                    if item['name'] != 'whole':
                        # a region item
                        if 'user' not in item['meta']:
                            if 'done' not in item['meta'] or item['meta']['done'] == 'false':
                                sel_item = item
                                break
                            else:
                                # the region is done, skip this region
                                continue
                        elif item['meta']['user'] == user['_id'] and \
                            ('done' not in item['meta'] or item['meta']['done'] == 'false'):
                            # this item is already assigned to this user, just return it
                            return {
                                'user_id': user['_id'],
                                'item_id': item['_id']
                            }
                        else:
                            # if the region is already assigned to other user, skip this region
                            continue
                    # a whole partition item, look into regions for assignment
                    coords = item['meta']['coordinates']
                    x_range = coords["max_x"] - coords["min_x"]
                    y_range = coords["max_y"] - coords["min_y"]
                    z_range = coords["max_z"] - coords["min_z"]
                    if 'done' not in item['meta'] or item['meta']['done'] == 'false':
                        # look into regions of this whole item for assignment
                        for key, val in item['meta']['regions'].items():
                            if 'user' not in val:
                                # this region can be assigned to a user
                                val['user'] = user['_id']
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
                                item_files = File().find({'itemId': item['_id']})
                                for item_file in item_files:
                                    file_path = path_util.getResourcePath('file',
                                                                          item_file,
                                                                          force=True)
                                    tif = TIFF.open(file_path, mode="r")
                                    file_name = os.path.basename(file_path)
                                    file_base_name, file_ext = os.path.splitext(file_name)
                                    out_path = f'/tmp/{file_base_name}_region_{key}{file_ext}'
                                    output_tif = TIFF.open(out_path, mode="w")
                                    counter = 0
                                    for image in tif.iter_images():
                                        if counter >= min_z and counter <= max_z:
                                            img = image[min_y:max_y+1, min_x:max_x+1]
                                            output_tif.write_image(img)
                                        if counter > max_z:
                                            break
                                        counter += 1
                                    save_file(region_item, out_path, admin_user,
                                              f'{file_base_name}_region_{key}{file_ext}')
                                    os.remove(out_path)
                                    add_meta = {'done': 'false'}
                                    Item().setMetadata(item, add_meta)
                                    add_meta = {'coordinates': {
                                        "x_max": max_x,
                                        "x_min": min_x,
                                        "y_max": max_y,
                                        "y_min": min_y,
                                        "z_max": max_z,
                                        "z_min": min_z
                                    }}
                                    Item().setMetadata(region_item, add_meta)
                                sel_item = region_item
                                print(sel_item, flush=True)
                                break

                if sel_item:
                    add_meta = {'user': user['_id']}
                    Item().setMetadata(sel_item, add_meta)
                    return {
                        'user_id': user['_id'],
                        'item_id': sel_item['_id']
                    }

    if not sel_item:
        # there is no item left to assign to this user
        return {
            'user_id': user['_id'],
            'item_id': ''
        }


def save_user_annotation(user, item_id, done, comment, content_data):
    """
    Save user annotation to item with item_id
    :param user: user object who saves annotation
    :param item_id: item the annotation is saved to
    :param done: whether annotation is done or only an intermediate save
    :param comment: annotation comment from the user
    :param content_data: annotation content blob to be saved on server
    :return: success or failure
    """
    uid = user['_id']
    uname = user['login']
    item = Item().findOne({'_id': ObjectId(item_id)})
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
    for file in files:
        if 'masks.tif' in file['name']:
            mask_file_name = file['name']
            annot_file_name = f'{os.path.splitext(mask_file_name)[0]}_{uname}.tif'
            break
    if not annot_file_name:
        raise RestException('failure: cannot find the mask file for the annotated item', 500)
    content = content_data.file.read()
    try:
        # save file to local file system before adding it to asset store
        path = f'/tmp/{annot_file_name}'
        with open(path, "wb") as f:
            f.write(content)

        file = save_file(item, path, user, annot_file_name)
        os.remove(path)
    except Exception as e:
        raise RestException(f'failure: {e}', 500)

    # check if all regions for the partition is done, and if so add done metadata to whole item
    items = Item().find({'folderId': ObjectId(item['folderId'])})
    partition_done = True
    partition_item = None
    for it in items:
        if it['name'] == 'whole':
            partition_item = it
        elif 'done' not in it['meta'] or it['meta']['done'] == 'false':
            partition_done = False
        if partition_done and partition_item:
            break
    if partition_done and partition_item:
        add_meta = {'done': 'true'}
        Item().setMetadata(partition_item, add_meta)

    return {
        'user_id': uid,
        'item_id': item_id,
        'annotation_file_id': file['_id']
    }
