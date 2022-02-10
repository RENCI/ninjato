import registerWebworker from 'webworker-promise/lib/register';

import { SlicingMode } from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';

const globals = {
  // single-component labelmap
  buffer: null,
  sliceBuffer: null,
  dimensions: [0, 0, 0],
  prevPoint: null,
  slicingMode: null, // 2D or 3D painting
};

// --------------------------------------------------------------------------
// center and scale3 are in IJK coordinates
function handlePaintEllipse({ center, scale3 }) {
  const radius3 = [...scale3];
  const indexCenter = center.map((val) => Math.round(val));

  let sliceAxis = -1;
  if (globals.slicingMode != null && globals.slicingMode !== SlicingMode.NONE) {
    sliceAxis = globals.slicingMode % 3;
  }

  const yStride = globals.dimensions[0];
  const zStride = globals.dimensions[0] * globals.dimensions[1];

  let [xmin, ymin, zmin] = indexCenter;
  let [xmax, ymax, zmax] = indexCenter;

  if (sliceAxis !== 2) {
    zmin = Math.round(Math.max(indexCenter[2] - radius3[2], 0));
    zmax = Math.round(
      Math.min(indexCenter[2] + radius3[2], globals.dimensions[2] - 1)
    );
  }

  for (let z = zmin; z <= zmax; z++) {
    let dz = 0;
    if (sliceAxis !== 2) {
      dz = (indexCenter[2] - z) / radius3[2];
    }

    const dzSquared = dz * dz;

    if (dzSquared <= 1) {
      const ay = radius3[1] * Math.sqrt(1 - dzSquared);
      if (sliceAxis !== 1) {
        ymin = Math.round(Math.max(indexCenter[1] - ay, 0));
        ymax = Math.round(
          Math.min(indexCenter[1] + ay, globals.dimensions[1] - 1)
        );
      }

      for (let y = ymin; y <= ymax; y++) {
        let dy = 0;
        if (sliceAxis !== 1) {
          dy = (indexCenter[1] - y) / radius3[1];
        }
        const dySquared = dy * dy;
        if (dySquared + dzSquared <= 1) {
          if (sliceAxis !== 0) {
            const ax = radius3[0] * Math.sqrt(1 - dySquared - dzSquared);
            xmin = Math.round(Math.max(indexCenter[0] - ax, 0));
            xmax = Math.round(
              Math.min(indexCenter[0] + ax, globals.dimensions[0] - 1)
            );
          }
          if (xmin <= xmax) {
            const index = y * yStride + z * zStride;
            globals.buffer.fill(1, index + xmin, index + xmax + 1);
          }
        }
      }
    }
  }
}

// --------------------------------------------------------------------------

function handlePaint({ point, radius }) {
  if (!globals.prevPoint) {
    globals.prevPoint = point;
  }

  // DDA params
  const delta = [
    point[0] - globals.prevPoint[0],
    point[1] - globals.prevPoint[1],
    point[2] - globals.prevPoint[2],
  ];
  const inc = [1, 1, 1];
  for (let i = 0; i < 3; i++) {
    if (delta[i] < 0) {
      delta[i] = -delta[i];
      inc[i] = -1;
    }
  }
  const step = Math.max(...delta);

  // DDA
  const thresh = [step, step, step];
  const pt = [...globals.prevPoint];
  for (let s = 0; s <= step; s++) {
    handlePaintEllipse({ center: pt, scale3: radius });

    for (let ii = 0; ii < 3; ii++) {
      thresh[ii] -= delta[ii];
      if (thresh[ii] <= 0) {
        thresh[ii] += step;
        pt[ii] += inc[ii];
      }
    }
  }

  globals.prevPoint = point;
}

// Based on algorithm here: https://lodev.org/cgtutor/floodfill.html
function floodFillScanlineStack({ buffer, w, h, seed }) {
  let x1;
  let spanAbove, spanBelow;

  const stack = [seed];
  while (stack.length > 0) {
    const [x, y] = stack.pop();

    x1 = x;
    while (x1 >= 0 && buffer[y * w + x1] === 0) x1--;
    x1++;

    spanAbove = spanBelow = 0;
    while(x1 < w && buffer[y * w + x1] === 0)
    {
      buffer[y * w + x1] = 1;

      if(!spanAbove && y > 0 && buffer[(y - 1) * w + x1] === 0)
      {
        stack.push([x1, y - 1]);
        spanAbove = 1;
      }
      else if(spanAbove && y > 0 && buffer[(y - 1) * w + x1] !== 0)
      {
        spanAbove = 0;
      }
      if(!spanBelow && y < h - 1 && buffer[(y + 1) * w + x1] === 0)
      {
        stack.push([x1, y + 1]);
        spanBelow = 1;
      }
      else if(spanBelow && y < h - 1 && buffer[(y + 1) * w + x1] !== 0)
      {
        spanBelow = 0;
      }
      x1++;
    }
  }
} 

// XXX: Currently assuming z slice
function handlePaintFloodFill({ labels, label, pointList, radius }) {
  if (pointList.length === 0) return;

  globals.buffer.set(labels.map(d => d === label ? 1 : 0));

  // Paint points
  pointList.forEach((point, i) => {
    handlePaint({ point, radius });

    if (i === 0) globals.prevPoint = null;
  });

  // Slice info
  const w = globals.dimensions[0];
  const h = globals.dimensions[1];
  const z = pointList[0][2];

  const jStride = w;
  const kStride = w * h;

  // Temporary slice buffer
  const buffer = new Uint8Array(w * h);

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const v = globals.buffer[x + jStride * y + kStride * z];
      buffer[x + jStride * y] = v;
    }
  }

  // Find good seed point
  const bb = pointList.reduce((bb, [x, y]) => {
    if (x < bb[0]) bb[0] = x;
    if (x > bb[1]) bb[1] = x;
    if (y < bb[2]) bb[2] = y;
    if (y > bb[3]) bb[3] = y;
    return bb;
  }, [Infinity, -Infinity, Infinity, -Infinity]);
    
  let seed = null;
  for (let x = 0; x < w && seed === null; x++) {
    for (let y = 0; y < h; y++) {
      if (x < bb[0] || x > bb[1] || y < bb[2] || y > bb[3]) {
        if (buffer[x + jStride * y] === 0) {
          seed = [x, y];
          break;
        }
      }
    }
  }

  if (seed === null) return;

  floodFillScanlineStack({ buffer, w, h, seed });

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (buffer[x + jStride * y] === 0) globals.buffer[x + jStride * y + kStride * z] = 1;
    }
  }
}

// XXX: Currently assuming z slice
function handleErase({ pointList, radius }) {
  if (pointList.length === 0) return;

  // Paint points
  pointList.forEach((point, i) => {
    handlePaint({ point, radius });

    if (i === 0) globals.prevPoint = null;
  });
}

// --------------------------------------------------------------------------

registerWebworker()
  .operation('start', ({ bufferType, dimensions, slicingMode }) => {
    if (!globals.buffer) {
      const bufferSize = dimensions[0] * dimensions[1] * dimensions[2];
      /* eslint-disable-next-line */
      globals.buffer = new self[bufferType](bufferSize);
      globals.dimensions = dimensions;
      globals.prevPoint = null;
      globals.slicingMode = slicingMode;
    }
  })
  .operation('paintFloodFill', handlePaintFloodFill)
  .operation('erase', handleErase)
  .operation('end', () => {
    const response = new registerWebworker.TransferableResponse(
      globals.buffer.buffer,
      [globals.buffer.buffer]
    );
    globals.buffer = null;
    return response;
  });