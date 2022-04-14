import girder_client
import argparse
import os
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
            print(vol_folder['_id'])
            for sub_vol_folder in sub_vol_folders:
                folders = gc.listFolder(sub_vol_folder['_id'], parentFolderType='folder')
                for folder in folders:
                    items = gc.listItem(folder['_id'], name='whole')
                    found = False
                    for item in items:
                        files = gc.listFile(item['_id'])
                        for file in files:
                            if file['name'].endswith('masks.tif'):
                                file_to_item_id[file['name']] = item['_id']
                                found = True
                                break
                        if found:
                            break
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
            meta_dict = {'regions': {},
                         'max_region_id': max_level}
            for lev in range(min_level, max_level+1):
                level_indices = np.where(imarray == lev)
                z_min = min(level_indices[0])
                z_max = max(level_indices[0])
                y_min = min(level_indices[1])
                y_max = max(level_indices[1])
                x_min = min(level_indices[2])
                x_max = max(level_indices[2])
                # need to convert extent values to int from int64, otherwise, JSON serialization
                # will raise exception when adding metadata to item
                meta_dict['regions'][lev] = {
                    "x_max": int(x_max),
                    "x_min": int(x_min),
                    "y_max": int(y_max),
                    "y_min": int(y_min),
                    "z_max": int(z_max),
                    "z_min": int(z_min)
                }
            file_name = os.path.basename(file_name_with_path)
            if file_name in file_to_item_id:
                gc.addMetadataToItem(file_to_item_id[file_name], meta_dict)


