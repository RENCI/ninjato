import UTIF from 'utif';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

export const readTIFF = buffer => {
  const ifds = UTIF.decode(buffer);

  if (ifds.length === 0) return null;

  ifds.forEach(ifd => UTIF.decodeImage(buffer, ifd));  

  const { width, height } = ifds[0];
  const depth = ifds.length;
  const numComponents = 2; // Should read this from the file info

  const data = [];
  ifds.forEach((ifd, z) => {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const v = ifd.data[x * height * numComponents + y * numComponents];

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

  console.log(image.getBounds());

  return image;
}; 