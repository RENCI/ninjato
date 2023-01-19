import girder_client
import json
import argparse


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('girder_api_url', type=str, help='girder API URL')
    parser.add_argument('girder_username', type=str, help='girder user name for authentication')
    parser.add_argument('girder_password', type=str, help='girder user password for authentication')
    parser.add_argument('whole_subvolume_item_id', type=str, help="whole subvolume item_id to get region status from")
    parser.add_argument('output_file_name', type=str, help='output file name to write region status to')
    args = parser.parse_args()
    girder_api_url = args.girder_api_url
    girder_username = args.girder_username
    girder_password = args.girder_password
    whole_subvolume_item_id = args.whole_subvolume_item_id
    output_file_name = args.output_file_name

    regions = []
    gc = girder_client.GirderClient(apiUrl=girder_api_url)
    gc.authenticate(girder_username, girder_password)
    with gc.session() as session:
        whole_item = gc.getItem(whole_subvolume_item_id)
        for key, val in whole_item['meta']['regions'].items():
            if 'item_id' not in val:
                regions.append({
                    "label": key,
                    "done": False,
                    "verified": False
                })
                continue
            assign_item = gc.getItem(val['item_id'])
            regions.append({
                "label": key,
                "done": True if 'annotation_done' in assign_item['meta'] and
                                assign_item['meta']['annotation_done'] == 'true' else False,
                "verified": True if 'review_approved' in assign_item['meta'] and
                                    assign_item['meta']['review_approved'] == 'true' else False
            })
    with open(output_file_name, "w") as fp:
        json.dump(regions, fp, indent=4)
