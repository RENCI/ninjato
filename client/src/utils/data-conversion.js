import * as tiff from 'tiff';
import utif from 'utif';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

// Based on encodeImage from utif, but adjusted for 16-bit single component images
const encodeImage = function(image, w, h, z, n, bpp = 16)
{
  const offset = 8;

	const idf = { 
    't254': [2], 't256': [w], 't257': [h], 't258': [bpp], 't259': [1], 't262': [1], 't273': [offset],
		't274': [1], 't277': [1], 't278': [h], 't279': [w * h * bpp / 8],
		't282': [10], 't283': [10], 't284': [1], 't296': [3], 't297': [z, n]
	};
	
	const prfx = new Uint8Array(utif.encode([idf]));
	const img = new Uint8Array(image);
  const data = new Uint8Array(offset + w * h * 4);
  
	for (let i = 0; i < prfx.length; i++ ) data[i] = prfx[i];
  for (let i = 0; i < img.length; i++ ) data[offset + i] = img[i];
  
	return data.buffer;
}

export const readTIFF = buffer => {

  const pages = utif.decode(buffer);


  const ifds = tiff.decode(buffer);

  if (ifds.length === 0) return null;

  console.log(pages);
  console.log(ifds);

  console.log(pages[0].data);
  console.log(ifds[0]);

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

export const writeTIFF = image => {
  const [width, height] = image.getDimensions();
  const [min, max] = image.getPointData().getScalars().getRange();

  console.log(width, height);

  const data = image.getPointData().getScalars().getData();

  console.log(image.getPointData());
  console.log(image.getPointData().getScalars());

  console.log(data);

  const rgba = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const v = data[x * height + y] / max * 255;
      console.log(v);
      rgba.push(v, v, v, 255);
    }
  }

  console.log(rgba);

  const buffer = utif.encodeImage(rgba, width, height);

  console.log(buffer);

  const blob = new Blob([buffer], { type: "image/tiff" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'testTIFF.tif';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url); 
  a.remove();
};