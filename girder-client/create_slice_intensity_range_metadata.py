import girder_client
import argparse
import os
import json
import numpy as np
from libtiff import TIFF


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('--data_dir', type=str, required=True, help='input data directory')
    parser.add_argument('--girder_api_url', type=str, required=True, help='girder API URL')
    parser.add_argument('--girder_username', type=str, required=True,
                        help='girder user name for authentication')
    parser.add_argument('--girder_password', type=str, required=True,
                        help='girder user password for authentication')
    parser.add_argument('--girder_collection_id', type=str, required=True, help="girder data collection id")
    args = parser.parse_args()
    data_dir = args.data_dir
    girder_api_url = args.girder_api_url
    girder_username = args.girder_username
    girder_password = args.girder_password
    girder_coll_id = args.girder_collection_id

    file_name_list = []
    for dir_name, subdir_list, file_list in os.walk(data_dir):
        for file_name in file_list:
            if not file_name.lower().endswith('masks.tif'):
                file_name_list.append(os.path.join(dir_name, file_name))
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
                    items = gc.listItem(folder['_id'], name='whole')
                    found = False
                    for item in items:
                        files = gc.listFile(item['_id'])
                        for file in files:
                            if not file['name'].endswith('masks.tif'):
                                file_to_item_id[file['name']] = item['_id']
                                found = True
                                break
                        if found:
                            break

        for file_name_with_path in file_name_list:
            tif = TIFF.open(file_name_with_path)
            images = []
            for image in tif.iter_images():
                images.append(image)
            # imarray should be in order of ZYX
            imarray = np.array(images)
            print(imarray.shape)
            range_per_slice = {}
            for slice in range(int(imarray.shape[0])):
                min_intensity = np.min(imarray[slice::])
                max_intensity = np.max(imarray[slice::])
                range_per_slice[str(slice)] = {
                    "min": int(min_intensity),
                    "max": int(max_intensity)
                }
            meta_dict = {'intensity_range_per_slice': range_per_slice}
            file_name = os.path.basename(file_name_with_path)
            if file_name in file_to_item_id:
                gc.addMetadataToItem(file_to_item_id[file_name], meta_dict)
