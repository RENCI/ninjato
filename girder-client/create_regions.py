import girder_client
import argparse
import os
from PIL import Image
import numpy as np


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('--data_dir', type=str, required=True, help='input data directory')

    args = parser.parse_args()
    data_dir = args.data_dir

    file_list = []
    for dir_name, subdir_list, file_list in os.walk(data_dir):
        for file_name in file_list:
            if file_name.lower().endswith(('masks.tif')):
                file_list.append(os.path.join(dir_name, file_name))

    for file_name in file_list:
        im = Image.open(file_name)
        imarray = np.array(im)
        print(imarray.shape)
        levels = imarray[np.nonzero(imarray)]
        min_level = min(levels)
        max_level = max(levels)
        for lev in range(min_level, max_level+1):
            level_indices = np.where(imarray == lev)
            x_min = min(level_indices[0])
            x_max = max(level_indices[0])
            y_min = min(level_indices[1])
            y_max = max(level_indices[1])



