import * as tiff from 'tiff';
import utif from 'utif';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

export const readTIFF = buffer => {
  const ifds = tiff.decode(buffer);

  if (ifds.length === 0) return null;

  const { width, height } = ifds[0];
  const depth = ifds.length;

  const data = [];
  ifds.forEach((ifd, z) => {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const v = ifd.data[x * height + y];

        data[z * width * height + x * height + y] = v;
      }
    }
  });

  const image = vtkImageData.newInstance({
    origin: [0, 0, 0],
    spacing: [1, 1, 1],
    extent: [0, width - 1, 0, height - 1, 0, depth - 1]
  });

  const pointData = vtkDataArray.newInstance({
    name: 'scalars',
    values: data,
    numberOfComponents: 1
  });

  image.getPointData().setScalars(pointData);

  return image;
}; 

export const writeTIFF = data => {
  console.log(data);
};