import * as tiff from 'tiff';
import utif from 'utif';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';


const encodeImage = (image, w, h, n, bpp = 16) => {
  const stripByteCounts = w * h * bpp / 8;
  const arrayType = bpp === 32 ? Uint32Array : bpp === 16 ? Uint16Array : Uint8Array;

  // Augment utif tag types with some we need
  utif.ttypes[254] = 4;
  utif.ttypes[297] = 5;
 
  const idf = { 
    t254: [2],                // subfile type
    t256: [w],                // image width
    t257: [h],                // image height
    t258: [bpp],              // bits per sample
    t259: [1],                // compression
    t262: [1],                // photometric interpretation
    t274: [1],                // orientation
    t277: [1],                // samples per pixel
    t278: [h],                // rows per strip
    t279: [stripByteCounts],  // strip byte counts
    t282: [10],               // x resolution
    t283: [10],               // y resolution
    t284: [1],                // planar configuration
    t296: [3]                 // resolution unit
  };

  const headerOffset = 10000;
  let offset = headerOffset;
  const idfs = [];
  for (let i = 0; i < n; i++) {
    idf.t273 = [offset];      // strip offsets
    idf.t297 = [i, n];        // page number

    idfs.push({...idf});

    offset += stripByteCounts;
  }

  console.log(idfs);
	
	const prfx = new arrayType(utif.encode(idfs));
	const img = new arrayType(image);
  const data = new arrayType(headerOffset + stripByteCounts);
  
	for(let i = 0; i < prfx.length; i++) data[i] = prfx[i];
  for(let i = 0; i < img.length; i++) data[headerOffset + i] = img[i];
  
	return data.buffer;
}

/*

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

*/

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
  const [width, height, depth] = image.getDimensions();
  const [min, max] = image.getPointData().getScalars().getRange();

  console.log(width, height);

  const data = image.getPointData().getScalars().getData();

  console.log(image.getPointData());
  console.log(image.getPointData().getScalars());

  const buffer = encodeImage(data, width, height, depth);

  console.log(buffer);

  const blob = new Blob([buffer], { type: 'image/tiff' });

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