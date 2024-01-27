from girder.models.item import Item
from bson.objectid import ObjectId
from .utils import create_region_files, REVIEW_APPROVE_KEY, \
    update_user_mask_from_updated_mask, get_label_ids


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
        if REVIEW_APPROVE_KEY in assign_item['meta'] and \
            assign_item['meta'][REVIEW_APPROVE_KEY] == 'true':
            # if annotation is already review approved, does not update
            continue

        saved_assign_item = Item().findOne({'_id': ObjectId(saved_assign_item_id)})
        saved_assign_item_extent = saved_assign_item['meta']['coordinates']
        assign_item_extent = assign_item['meta']['coordinates']
        # check if two extents overlap and there is no need for updating if extents don't overlap
        if (assign_item_extent["x_max"] <= saved_assign_item_extent["x_min"]) or \
           (assign_item_extent["y_max"] <= saved_assign_item_extent["y_min"]) or \
           (assign_item_extent["z_max"] <= saved_assign_item_extent["z_min"]) or \
           (assign_item_extent["x_min"] >= saved_assign_item_extent["x_max"]) or \
           (assign_item_extent["y_min"] >= saved_assign_item_extent["y_max"]) or \
           (assign_item_extent["z_min"] >= saved_assign_item_extent["z_max"]):
            continue
        create_region_files(assign_item, whole_item)
        update_user_mask_from_updated_mask(assign_item_id, get_label_ids(saved_assign_item))

        updated_assign_item_ids.append(val['item_id'])
        print(f"updated assignment masks for {val['item_id']} in whole item {whole_item['_id']}",
              flush=True)
    return
