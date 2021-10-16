from girder.models.item import Item
from bson.objectid import ObjectId
from girder.models.collection import Collection


def get_item_assignment(user):
    items = Item().find({'folderId': ObjectId('615380934fc1dbc94c562c4e')})
    item_list = []
    for item in items:
        if 'user' not in item['meta']:
            item_list.append(item)
        elif item['meta']['user'] == user['_id']:
            # this item is already assigned to this user, just return it
            return {
                'user_id': user['_id'],
                'item_id': item['_id']
            }

    if item_list:
        add_meta = {'user': user['_id']}
        item = item_list[0]
        Item().setMetadata(item, add_meta)
        return {
            'user_id': user['_id'],
            'item_id': item['_id']
        }
    else:
        # there is no item left to assign to this user
        return {
            'user_id': user['_id'],
            'item_id': ''
        }
