import argparse
import os
import numpy as np
from libtiff import TIFF


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('data_dir', type=str, help='input data directory')

    args = parser.parse_args()
    data_dir = args.data_dir
    file_name_list = []
    for dir_name, subdir_list, file_list in os.walk(data_dir):
        for file_name in file_list:
            if file_name.lower().endswith('masks.tif'):
                file_name_list.append(os.path.join(dir_name, file_name))
    print(file_name_list, flush=True)

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
                     'max_region_id': int(max_level)}
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
            meta_dict['regions'][str(lev)] = {
                "x_max": int(x_max),
                "x_min": int(x_min),
                "y_max": int(y_max),
                "y_min": int(y_min),
                "z_max": int(z_max),
                "z_min": int(z_min)
            }
            if lev == 850 or lev == 851:
                print(lev, meta_dict['regions'][str(lev)])
