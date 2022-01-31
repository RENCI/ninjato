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
            folders = Folder().find({
                'parentId': sub_vol_folder['_id'],
                'parentCollection': 'folder'
            })
            for folder in folders:
                items = Item().find({'folderId': ObjectId(folder['_id'])})
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

        for asset in AssetstoreModel().list():
            asset_store_id = asset['_id']
            break
        asset_store = AssetstoreModel().load(asset_store_id)
        adapter = assetstore_utilities.getAssetstoreAdapter(asset_store)
        file = adapter.importFile(item, path, user, name=annot_file_name, mimeType='image/tiff')
    except Exception as e:
        raise RestException(f'failure: {e}', 500)
    return {
        'user_id': uid,
        'item_id': item_id,
        'annotation_file_id': file['_id']
    }
