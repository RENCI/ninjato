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
                        # only look at whole item to find regions for assignment
                        continue
                    coords = item['meta']['coordinates']
                    x_range = coords["x_max"] - coords["x_min"]
                    y_range = coords["y_max"] - coords["y_min"]
                    z_range = coords["z_max"] - coords["z_min"]

                    if 'user' not in item['meta']:
                        if 'done' not in item['meta']:
                            # look into regions of this whole item for assignment
                            for key, val in item['regions'].items():
                                if 'user' not in val:
                                    # this region can be assigned to a user
                                    # create an item for this selected region
                                    width = (val['x_max'] - val['x_min']) * BUFFER_X_Y_FACTOR
                                    half_width = width/2
                                    height = (val['y_max'] - val['y_min']) * BUFFER_X_Y_FACTOR
                                    half_height = height / 2
                                    min_x = val['x_min'] - half_width
                                    max_x = val['x_max'] + half_width
                                    min_y = val['y_min'] - half_height
                                    max_y = val['y_max'] + half_height
                                    min_z = val['z_min'] - BUFFER_Z_ADDITION
                                    max_z = val['z_max'] + BUFFER_Z_ADDITION
                                    min_x = min_x if min_x >= 0 else 0
                                    min_y = min_y if min_y >= 0 else 0
                                    min_z = min_z if min_z >= 0 else 0
                                    max_x = max_x if max_x <= x_range else x_range
                                    max_y = max_y if max_y <= y_range else y_range
                                    max_z = max_z if max_z <= z_range else z_range

                                    region_item = Item().createItem(
                                        f'region{key}',
                                        creator=User.getAdmins()[0],
                                        folder=folder,
                                        description=f'region{key} of the partition')
                                    item_files = File().find({'itemId': item['_id']})
                                    for item_file in item_files:
                                        file_path = path_util.getResourcePath('file',
                                                                              item_file,
                                                                              force=True)
                                        tif = TIFF.open(file_path, mode="r")
                                        images = []
                                        for image in tif.iter_images():
                                            images.append(image)
                                        # imarray should be in order of ZYX
                                        imarray = np.array(images)
                                        print(imarray.shape)
                                        sub_im = imarray[min_z:max_z+1, min_y:max_y+1, min_x:max_x+1]
                                        file_name = os.path.basename(file_path)
                                        file_base_name, file_ext = os.path.splitext(file_name)
                                        out_path = f'/tmp/{file_base_name}_region_{key}{file_ext}'
                                        output_tif = TIFF.open(out_path, mode="w")
                                        for z in range(min_z, max_z+1):
                                            output_tif.write_image()
                                    sel_item = region_item
                                    break
                        elif item['meta']['done'] == 'false':
                            sel_item = item
                            break
                    elif item['meta']['user'] == user['_id']:
                        # this item is already assigned to this user, just return it
                        return {
                            'user_id': user['_id'],
                            'item_id': item['_id']
                        }

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
    return {
        'user_id': uid,
        'item_id': item_id,
        'annotation_file_id': file['_id']
    }
