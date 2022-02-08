import * as tiff from 'tiff';
import utif from 'utif';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

// Augment utif tag types with some we need
utif.ttypes[254] = 4;
utif.ttypes[297] = 5;

// Based on encodeImage from utif, but adjusted for multipage single component images with different bits
const encodeImage = (image, w, h, n, bpp = 16) => {
  const bytes = bpp / 8;
  const stripByteCounts = w * h * bytes;
  const arrayType = bpp === 32 ? Uint32Array : bpp === 16 ? Uint16Array : Uint8Array;
 
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


  // XXX: Magic number, should be able to calculate from idf size?
  const headerOffset = 120 * n;
  
  const idfs = [];
  for (let i = 0; i < n; i++) {
    const offset = headerOffset * bytes + i * stripByteCounts;

    idfs.push({
      ...idf,
      t273: [offset],      // strip offsets
      t297: [i, n],        // page number
    });
  }
  
  const prfx = new arrayType(utif.encode(idfs));
  const data = new arrayType(headerOffset + n * stripByteCounts);
  const view = new DataView(data.buffer);
  
	for (let i = 0; i < prfx.length; i++) data[i] = prfx[i];
  for (let i = 0; i < image.length; i++) view.setUint16(headerOffset * bytes + i * bytes, image[i], false);

	return view.buffer;
}

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
  const spacing = [1, 1, 1.5];

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

export const encodeTIFF = imageData => {
  const [width, height, depth] = imageData.getDimensions();
  const data = imageData.getPointData().getScalars().getData();

  const buffer = encodeImage(data, width, height, depth);

  return buffer;
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