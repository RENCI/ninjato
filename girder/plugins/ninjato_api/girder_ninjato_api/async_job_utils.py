from girder.models.item import Item
from bson.objectid import ObjectId
from .utils import create_region_files


def update_all_assignment_masks(job):
    whole_item, saved_assign_item_id = job['args']
    if not whole_item or not saved_assign_item_id:
        return
    updated_assign_item_ids = []
    for key, val in whole_item['meta']['regions'].items():
        if 'item_id' not in val:
            continue

        if val['item_id'] == saved_assign_item_id or val['item_id'] in updated_assign_item_ids:
            continue

        assign_item_id = ObjectId(val['item_id'])
        # update corresponding assignment mask
        assign_item = Item().findOne({'_id': assign_item_id})
        if not assign_item['meta']['region_ids']:
            # the assignment does not have any regions, so nothing to update
            continue
        if 'annotation_done' in assign_item['meta'] and assign_item['meta']['annotation_done'] == 'true':
            # if annotation is done, does not update
            continue
        create_region_files(assign_item, whole_item)
        updated_assign_item_ids.append(val['item_id'])
        print(f"updated assignment masks for {val['item_id']} in whole item {whole_item['_id']}",
              flush=True)
    return
