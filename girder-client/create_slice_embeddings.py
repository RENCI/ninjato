import numpy as np
import os
import argparse
import requests
from PIL import Image
from libtiff import TIFF


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process arguments.')
    parser.add_argument('data_file_name_with_path', type=str, help='input data file name with path')

    args = parser.parse_args()
    data_file_name_with_path = args.data_file_name_with_path

    url = 'https://sam.apps.renci.org/image_slice_embedding'
    headers = {"accept": "application/octet-stream"}
    try:
        tif = TIFF.open(data_file_name_with_path)
        images = []
        for image in tif.iter_images():
            if tif.isbyteswapped():
                image = image.byteswap()
            images.append(image)
        for i, img in enumerate(images):
            # cast image down from 16 bits to 8 bits
            image = img.astype("uint8")
            # convert image to RGB by replicating each intensity into RGB components added as the third axis
            image_rgb = image[:, :, np.newaxis].repeat(3, axis=2)
            im = Image.fromarray(image_rgb)
            im_file_name = f"{os.path.dirname(data_file_name_with_path)}/slices/" \
                           f"{os.path.splitext(data_file_name_with_path)[0].split('/')[-1]}_slice_{i}.jpg"
            im.save(im_file_name)
            files = {"image": (im_file_name, open(im_file_name, "rb"), "image/jpeg")}
            response = requests.post(url, headers=headers, files=files)
            if response.status_code == 200:
                dtype_header = response.headers.get('x-numpy-dtype')
                shape_header = response.headers.get('x-numpy-shape')
                dtype = np.dtype(dtype_header)
                shape = tuple(map(int, shape_header.strip('[]').split(',')))
                embed_array = np.frombuffer(response.content, dtype=dtype).reshape(shape)
                print(dtype, shape, embed_array.shape)

                np.save(f"{os.path.dirname(data_file_name_with_path)}/embeddings/"
                        f"{os.path.splitext(data_file_name_with_path)[0].split('/')[-1]}_embedding_{i}.npy",
                        embed_array)
            else:
                print(f"Request failed: {response}")
                exit(1)
    except Exception as e:
        print(f"Exception: {e}")
        exit(1)
