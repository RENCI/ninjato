import * as tiff from 'tiff';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

export const decodeTIFF = buffer => {
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

  // XXX: Should read spacing from server/TIFF file
  const spacing = [1, 1, 3];

  const imageData = vtkImageData.newInstance({
    origin: [0, 0, 0],
    spacing: spacing,
    extent: [0, width - 1, 0, height - 1, 0, depth - 1]
  });

  const pointData = vtkDataArray.newInstance({
    name: 'scalars',
    values: data,
    numberOfComponents: 1
  });

  imageData.getPointData().setScalars(pointData);

  return imageData;
}; 

export const saveTIFF = (buffer, fileName) => {
  const blob = new Blob([buffer], { type: 'image/tiff' });

  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;

  document.body.appendChild(a);
  a.click();
  
  window.URL.revokeObjectURL(url); 
  a.remove();
};

export const createByteStream = imageData => {
  return new Uint16Array(imageData.getPointData().getScalars().getData());
};