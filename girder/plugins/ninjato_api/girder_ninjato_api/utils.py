from girder.models.item import Item
from bson.objectid import ObjectId
from girder.models.collection import Collection
from girder.models.folder import Folder
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


def save_user_annotation(user, item_id):
    return {
        'user_id': user['_id'],
        'item_id': item_id
    }
