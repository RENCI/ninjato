import girder_client
import json
import argparse
import os
import sys
import numpy as np
from libtiff import TIFF


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('data_dir', type=str, help='input data directory')
    parser.add_argument('girder_api_url', type=str, help='girder API URL')
    parser.add_argument('girder_username', type=str, help='girder user name for authentication')
    parser.add_argument('girder_password', type=str, help='girder user password for authentication')
    parser.add_argument('girder_collection_id', type=str, help="girder data collection id")
    parser.add_argument('--input_json_file', type=str, default='', help='input json file containing verified info')
    parser.add_argument('--whole_subvolume_item_id', type=str, default='',
                        help="whole subvolume item_id to set verified info")

    args = parser.parse_args()
    data_dir = args.data_dir
    girder_api_url = args.girder_api_url
    girder_username = args.girder_username
    girder_password = args.girder_password
    girder_coll_id = args.girder_collection_id
    input_json_file = args.input_json_file
    whole_subvolume_item_id = args.whole_subvolume_item_id
    verified_regions = []
    if input_json_file and whole_subvolume_item_id:
        with open(input_json_file, 'r') as input_f:
            input_data = json.load(input_f)
            input_data = input_data['regions']
            print(f'total regions: {len(input_data)}')
            for reg in input_data:
                if reg['verified'] is True:
                    verified_regions.append(reg['label'])
            print(f'verified regions: {len(verified_regions)}')

    file_name_list = []
    for dir_name, subdir_list, file_list in os.walk(data_dir):
        for file_name in file_list:
            if file_name.lower().endswith('masks.tif'):
                file_name_list.append(os.path.join(dir_name, file_name))
    print(file_name_list, flush=True)
    gc = girder_client.GirderClient(apiUrl=girder_api_url)
    gc.authenticate(girder_username, girder_password)
    with gc.session() as session:
        vol_folders = gc.listFolder(girder_coll_id, parentFolderType='collection')
        file_to_item_id = {}
        for vol_folder in vol_folders:
            sub_vol_folders = gc.listFolder(vol_folder['_id'], parentFolderType='folder')
            for sub_vol_folder in sub_vol_folders:
                folders = gc.listFolder(sub_vol_folder['_id'], parentFolderType='folder')
                for folder in folders:
                    items = gc.listItem(folder['_id'], name='_whole')
                    for item in items:
                        files = gc.listFile(item['_id'])
                        for file in files:
                            if file['name'].endswith('masks.tif'):
                                file_to_item_id[f'{vol_folder["name"]}/{sub_vol_folder["name"]}/{folder["name"]}/' \
                                                f'{item["name"]}/{file["name"]}'] = item['_id']
        print(file_to_item_id)

        for file_name_with_path in file_name_list:
            tif = TIFF.open(file_name_with_path)
            images = []
            for image in tif.iter_images():
                images.append(image)
            # imarray should be in order of ZYX
            imarray = np.array(images)
            print(imarray.shape)

            levels = imarray[np.nonzero(imarray)]
            min_level = min(levels)
            max_level = max(levels)
            print(f'min_level: {min_level}, max_level: {max_level}')
            meta_dict = {'regions': {},
                         'max_region_id': int(max_level)}
            whole_z_min = sys.maxsize
            whole_y_min = sys.maxsize
            whole_x_min = sys.maxsize
            whole_z_max = 0
            whole_y_max = 0
            whole_x_max = 0
            for lev in range(min_level, max_level+1):
                level_indices = np.where(imarray == lev)
                if (level_indices[0].size == 0) or (level_indices[1].size == 0) or (level_indices[2].size == 0):
                    continue
                z_min = min(level_indices[0])
                z_max = max(level_indices[0])
                y_min = min(level_indices[1])
                y_max = max(level_indices[1])
                x_min = min(level_indices[2])
                x_max = max(level_indices[2])
                # need to convert extent values to int from int64, otherwise, JSON serialization
                # will raise exception when adding metadata to item
                meta_dict['regions'][str(lev)] = {
                    "x_max": int(x_max),
                    "x_min": int(x_min),
                    "y_max": int(y_max),
                    "y_min": int(y_min),
                    "z_max": int(z_max),
                    "z_min": int(z_min)
                }
                if z_min < whole_z_min:
                    whole_z_min = z_min
                if y_min < whole_y_min:
                    whole_y_min = y_min
                if x_min < whole_x_min:
                    whole_x_min = x_min
                if z_max > whole_z_max:
                    whole_z_max = z_max
                if y_max > whole_y_max:
                    whole_y_max = y_max
                if x_max > whole_x_max:
                    whole_x_max = x_max

            # find the file_name with path excluding the top folder name sync_data
            slash_idx = os.path.dirname(file_name_with_path).find('/')
            if slash_idx == -1:
                file_name = file_name_with_path
            else:
                file_name = file_name_with_path[slash_idx+1:]
            if len(verified_regions) > 0 and str(file_to_item_id[file_name]) == whole_subvolume_item_id:
                # add verified metadata data
                for reg_id in verified_regions:
                    meta_dict['regions'][str(reg_id)]['review_approved'] = 'true'
            meta_dict['coordinates'] = {
                "x_max": int(whole_x_max),
                "x_min": int(whole_x_min),
                "y_max": int(whole_y_max),
                "y_min": int(whole_y_min),
                "z_max": int(whole_z_max),
                "z_min": int(whole_z_min)
            }
            if file_name in file_to_item_id:
                gc.addMetadataToItem(file_to_item_id[file_name], meta_dict)
