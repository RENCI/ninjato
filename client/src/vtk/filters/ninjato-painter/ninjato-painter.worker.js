import registerWebworker from 'webworker-promise/lib/register';

const globals = {
  // single-component labelmap
  buffer: null,
  sliceBuffer: null,
  dimensions: [0, 0, 0],
  prevPoint: null,
  slicingMode: null, // 2D or 3D painting
};

// --------------------------------------------------------------------------

// center and brush are in IJK coordinates
function paintWithBrush({ center, brush }) {
  const indexCenter = center.map((val) => Math.round(val));
  const z = indexCenter[2];
  const yStride = globals.dimensions[0];
  const zStride = globals.dimensions[0] * globals.dimensions[1];

  const jOffset = -Math.floor(brush.length / 2);
  for (let j = 0; j < brush.length; j++) {
    const iOffset = -Math.floor(brush[j].length / 2);
    for (let i = 0; i < brush[j].length; i++) {
      if (brush[j][i]) {
        const x = indexCenter[0] + iOffset + i;
        const y = indexCenter[1] + jOffset + j;

        const index = x + y * yStride + z * zStride;
        globals.buffer[index] = 1;
      }
    }
  }
}

// --------------------------------------------------------------------------

function paint({ point, brush }) {
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
    paintWithBrush({ center: pt, brush });

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
    while(x1 < w && buffer[y * w + x1] === 0) {
      buffer[y * w + x1] = 1;

      if(!spanAbove && y > 0 && buffer[(y - 1) * w + x1] === 0) {
        stack.push([x1, y - 1]);
        spanAbove = 1;
      }
      else if(spanAbove && y > 0 && buffer[(y - 1) * w + x1] !== 0) {
        spanAbove = 0;
      }
      if(!spanBelow && y < h - 1 && buffer[(y + 1) * w + x1] === 0) {
        stack.push([x1, y + 1]);
        spanBelow = 1;
      }
      else if(spanBelow && y < h - 1 && buffer[(y + 1) * w + x1] !== 0) {
        spanBelow = 0;
      }
      
      x1++;
    }
  }
} 

// XXX: Currently assuming z slice
function handleRunSam({ p1, p2, embedding, samModel }) {
  console.log(p1, p2, embedding, samModel)


}

// XXX: Currently assuming z slice
function handlePaint({ pointList, brush }) {
  if (pointList.length === 0) return;

  // Paint points
  pointList.forEach((point, i) => {
    paint({ point, brush });

    if (i === 0) globals.prevPoint = null;
  });
}

// XXX: Currently assuming z slice
function handlePaintFloodFill({ labels, label, labelConstraint, pointList, brush }) {
  if (pointList.length === 0) return;

  globals.buffer.set(labels.map(d => d === label ? 1 : 0));

  // Paint points
  pointList.forEach((point, i) => {
    paint({ point, brush });

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

  if (labelConstraint !== null) {
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const i = x + jStride * y + kStride * z;
        globals.buffer[i] = globals.buffer[i] === 1 && labels[i] === labelConstraint ? 1 : 0;
      }
    }  
  }
}

function handleCrop({ p1, p2 }) {
  const xStart = p1[0];
  const xStop = p2[0];
  const yStart = p1[1];
  const yStop = p2[1];
  const z = p1[2];

  const yStride = globals.dimensions[0];
  const zStride = globals.dimensions[0] * globals.dimensions[1];

  for (let i = xStart; i <= xStop; i++) {
    for (let j = yStart; j <= yStop; j++) {
      const index = i + j * yStride + z * zStride;
      globals.buffer[index] = 1;
    }
  }
};

function handleSplit({ labels, splitLabel, slice }) {
  const x = globals.dimensions[0];
  const y = globals.dimensions[1];
  const z = globals.dimensions[2];

  const jStride = x;
  const kStride = x * y;

  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = slice; k < z; k++) {
        const index = i + jStride * j + kStride * k;
        if (labels[index] === splitLabel) globals.buffer[index] = 1;
      }
    }
  }
}

function handleMerge({ labels, mergeLabel }) {
  globals.buffer.set(labels.map(d => d === mergeLabel ? 1 : 0));
}

function handleDelete() {
  globals.buffer.fill(1);
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
  .operation('runSam', handleRunSam)
  .operation('paint', handlePaint)
  .operation('paintFloodFill', handlePaintFloodFill)
  .operation('crop', handleCrop)
  .operation('split', handleSplit)
  .operation('merge', handleMerge)
  .operation('delete', handleDelete)
  .operation('end', () => {
    const response = new registerWebworker.TransferableResponse(
      globals.buffer.buffer,
      [globals.buffer.buffer]
    );
    globals.buffer = null;
    return response;
  });