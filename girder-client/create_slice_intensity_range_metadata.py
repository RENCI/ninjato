import girder_client
import argparse
import os
import numpy as np
from libtiff import TIFF


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('data_dir', type=str, help='input data directory')
    parser.add_argument('girder_api_url', type=str, help='girder API URL')
    parser.add_argument('girder_username', type=str, help='girder user name for authentication')
    parser.add_argument('girder_password', type=str, help='girder user password for authentication')
    parser.add_argument('girder_collection_id', type=str, help="girder data collection id")

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
                            if not file['name'].endswith('masks.tif'):
                                file_to_item_id[f'{vol_folder["name"]}/{sub_vol_folder["name"]}/' \
                                                f'{folder["name"]}/{item["name"]}/{file["name"]}'] = item['_id']
        print(file_to_item_id)

        for file_name_with_path in file_name_list:
            tif = TIFF.open(file_name_with_path)
            images = []
            for image in tif.iter_images():
                images.append(image)
            # imarray should be in order of ZYX
            imarray = np.array(images)
            print(imarray.shape)
            range_per_slice = []
            for slice in range(int(imarray.shape[0])):
                min_intensity = np.min(imarray[slice::])
                max_intensity = np.max(imarray[slice::])
                range_per_slice.append({
                    "min": int(min_intensity),
                    "max": int(max_intensity)
                })
            meta_dict = {'intensity_range_per_slice': range_per_slice}
            # find the file_name with path excluding the top folder name sync_data
            slash_idx = os.path.dirname(file_name_with_path).find('/')
            if slash_idx == -1:
                file_name = file_name_with_path
            else:
                file_name = file_name_with_path[slash_idx + 1:]
            if file_name in file_to_item_id:
                gc.addMetadataToItem(file_to_item_id[file_name], meta_dict)
