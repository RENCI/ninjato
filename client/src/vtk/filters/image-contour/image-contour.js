import macro from '@kitware/vtk.js/macros';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

const { vtkErrorMacro } = macro;

// ----------------------------------------------------------------------------
// vtkImageContour methods
// ----------------------------------------------------------------------------

function vtkImageContour(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkImageContour');

  publicAPI.requestData = (inData, outData) => {
    // implement requestData
    const input = inData[0];

    if (!input || input.getClassName() !== 'vtkImageData') {
      vtkErrorMacro('Invalid or missing input');
      return;
    }

    // Retrieve output and volume data
    const spacing = input.getSpacing();
    const dims = input.getDimensions();
    const inputScalars = input.getPointData().getScalars();
    const inputDataArray = input.getPointData().getScalars().getData();

    // Points - dynamic array
    const points = [];

    // Cells - dynamic array
    const quads = [];

    // Data - dynamic array
    const values = [];

    const getIndex = (point, dims) =>
      point[0] + point[1] * dims[0] + point[2] * dims[0] * dims[1];

    let kernelX = 0; // default K slicing mode
    let kernelY = 1;
    let kernelZ = 2;
    if (model.slicingMode === 1) {
      kernelX = 0;
      kernelY = 2;
      kernelZ = 1;
    } 
    else if (model.slicingMode === 0) {
      kernelX = 1;
      kernelY = 2;
      kernelZ = 0;
    }

    const offsets = [
      { dx: -1, dy:  0},
      { dx:  1, dy:  0},
      { dx:  0, dy: -1},
      { dx:  0, dy:  1 }
    ];

    const halfSpacing = spacing.map(d => d / 2);
    const w = model.width / 2 * spacing[kernelX];

    const toPixelCenter = v => Math.floor(v);;

    const jStride = dims[0];
    const kStride = dims[0] * dims[1];

    const zRange = [
      Math.max(model.sliceRange[0], 0),
      Math.min(model.sliceRange[1], dims[kernelZ])
    ];

    for (let z = zRange[0]; z <= zRange[1]; z++) {
      for (let y = 0; y < dims[kernelY]; y++) {
        for (let x = 0; x < dims[kernelX]; x++) {
          const value = inputDataArray[x + jStride * y + kStride * z];

          if (value === 0) continue;

          const ijk = [];
          ijk[kernelX] = x;
          ijk[kernelY] = y;
          ijk[kernelZ] = z;

          offsets.forEach(({ dx, dy }) => {
            const evalX = ijk[kernelX] + dx;
            const evalY = ijk[kernelY] + dy;

            // Check boundaries
            let value2 = 0;
            if (
              evalX >= 0 &&
              evalX < dims[kernelX] &&
              evalY >= 0 &&
              evalY < dims[kernelY]
            ) {
              const ijk2 = [];
              ijk2[kernelX] = evalX;
              ijk2[kernelY] = evalY;
              ijk2[kernelZ] = ijk[kernelZ];

              value2 = inputDataArray[getIndex(ijk2, dims)];
            }

            if (value2 !== value) {                
              const p = input.indexToWorld(ijk);
              const px = toPixelCenter(ijk[kernelX], spacing[kernelX], dims[kernelX]) + dx * halfSpacing[kernelX];
              const py = toPixelCenter(ijk[kernelY], spacing[kernelY], dims[kernelY]) + dy * halfSpacing[kernelY];
              const pz = p[kernelZ] + model.zOffset;

              const p1 = [];
              const p2 = [];
              const p3 = [];
              const p4 = [];
              
              if (dx === 0) {
                p1[kernelX] = px - halfSpacing[kernelX] - w;
                p1[kernelY] = py + w;
                p1[kernelZ] = pz;

                p2[kernelX] = px + halfSpacing[kernelX] + w;
                p2[kernelY] = py + w;
                p2[kernelZ] = pz;

                p3[kernelX] = px + halfSpacing[kernelX] + w;
                p3[kernelY] = py - w;
                p3[kernelZ] = pz; 

                p4[kernelX] = px - halfSpacing[kernelX] - w;
                p4[kernelY] = py - w;
                p4[kernelZ] = pz; 
              }
              else {              
                p1[kernelX] = px + w;
                p1[kernelY] = py - halfSpacing[kernelY] - w;
                p1[kernelZ] = pz;

                p2[kernelX] = px + w;
                p2[kernelY] = py + halfSpacing[kernelY] + w;
                p2[kernelZ] = pz;

                p3[kernelX] = px - w;
                p3[kernelY] = py + halfSpacing[kernelY] + w;
                p3[kernelZ] = pz; 

                p4[kernelX] = px - w;
                p4[kernelY] = py - halfSpacing[kernelY] - w;
                p4[kernelZ] = pz;   
              }            
                
              const labelOffset = model.labelOffsets[value];
              if (labelOffset) {
                p1[kernelZ] += labelOffset;
                p2[kernelZ] += labelOffset;
                p3[kernelZ] += labelOffset;
                p4[kernelZ] += labelOffset;
              }

              points.push(...p1, ...p2, ...p3, ...p4);
              values.push(value, value, value, value);
            }
          });
        }
      }
    }

    // Create quads
    for (let i = 0; i < points.length / 4; i++) {
      quads.push(4, i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3);
    }

    // Update output
    const polydata = vtkPolyData.newInstance();
    polydata.getPoints().setData(new Float32Array(points), 3);
    polydata.getPolys().setData(new Uint32Array(quads));
    polydata.getPointData().setScalars(vtkDataArray.newInstance({
      numberOfComponents: 1,
      values: values,
      dataType: inputScalars.getDataType(),
      name: inputScalars.getName()
    }));

    outData[0] = polydata;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  slicingMode: 2,
  sliceRange: [0, Infinity],
  width: 0.2,
  zOffset: -0.1,
  labelOffsets: {}
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 1, 1);
  macro.setGet(publicAPI, model, ['slicingMode', 'sliceRange', 'width', 'labelOffsets']);
  vtkImageContour(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkImageContour');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };