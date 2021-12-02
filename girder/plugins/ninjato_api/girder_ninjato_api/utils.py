import os
import json
from girder.models.item import Item
from girder.models.file import File
from bson.objectid import ObjectId
from girder.models.assetstore import Assetstore as AssetstoreModel
from girder.models.collection import Collection
from girder.models.folder import Folder
from girder.exceptions import RestException
from girder.utility import assetstore_utilities
from .constants import COLLECTION_NAME


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
            items = Item().find({'folderId': ObjectId(sub_vol_folder['_id'])})
            for item in items:
                if 'user' not in item['meta']:
                    if 'done' not in item['meta']:
                        sel_item = item
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


def save_user_annotation(user, item_id, done, content_data):
    """
    Save user annotation to item with item_id
    :param user: user object who saves annotation
    :param item_id: item the annotation is saved to
    :param done: whether annotation is done or only an intermediate save
    :param content_data: FormData object with annotation content blob included in data key
    and file size included in size key
    :return: success or failure
    """
    uid = user['_id']
    uname = user['login']
    item = Item().findOne({'_id': ObjectId(item_id)})
    if done:
        item['meta']['done'] = 'true'
    else:
        item['meta']['done'] = 'false'
    files = File().find({'itemId': ObjectId(item_id)})
    annot_file_name = ''
    for file in files:
        if 'masks.tif' in file['name']:
            mask_file_name = file['name']
            annot_file_name = f'{os.path.splitext(mask_file_name)[0]}_{uname}.tif'
            break
    print(annot_file_name, flush=True)
    if not annot_file_name:
        raise RestException('failure: cannot find the mask file for the annotated item', 500)
    if 'data' not in content_data or 'size' not in content_data:
        raise RestException('failure: content data input parameter must be in FormData '
                            'format with data key', 400)
    print(content_data, flush=True)
    print(type(content_data), flush=True)
    content_data = json.loads(content_data)
    print(type(content_data), flush=True)
    content = content_data['data']
    print(content, flush=True)
    size = content_data['size']
    print(size, flush=True)
    print(content, size, flush=True)
    asset_store_id = AssetstoreModel().list()[0]['_id']
    asset_store = AssetstoreModel.load(asset_store_id)
    file = File().createFile(item=item, name=annot_file_name, size=size, creator=user,
                             assetstore=asset_store, mimeType='image/tiff', saveFile=False)
    adapter = assetstore_utilities.getAssetstoreAdapter(asset_store)
    file = adapter.finalizeUpload(content, file)
    File().save(file)
    File().propagateSizeChange(item, size)
    return {
        'user_id': uid,
        'item_id': item_id,
        'annotation_file_id': file['_id']
    }
