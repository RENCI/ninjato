import macro from '@kitware/vtk.js/macros';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import * as vtkMath from '@kitware/vtk.js/Common/Core/Math';

const { vtkErrorMacro, vtkWarningMacro } = macro;

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
    const origin = input.getOrigin();
    const spacing = input.getSpacing();
    const dims = input.getDimensions();
    const s = input.getPointData().getScalars().getData();

    // Points - dynamic array
    const points = [];

    // Cells - dynamic array
    // First value is number of line segments, followed by pairs of indeces
    const lines = [];

    const getIndex = (point, dims) =>
    point[0] + point[1] * dims[0] + point[2] * dims[0] * dims[1];

    const getIJK = (index, dims) => {
      const ijk = [0, 0, 0];
      ijk[0] = index % dims[0];
      ijk[1] = Math.floor(index / dims[0]) % dims[1];
      ijk[2] = Math.floor(index / (dims[0] * dims[1]));
      return ijk;
    };

    const values = new Uint8Array(input.getNumberOfPoints());

    const inputDataArray = input.getPointData().getScalars().getData();

    let kernelX = 0; // default K slicing mode
    let kernelY = 1;
    if (model.slicingMode === 1) {
      kernelX = 0;
      kernelY = 2;
    } 
    else if (model.slicingMode === 0) {
      kernelX = 1;
      kernelY = 2;
    }

    inputDataArray.forEach((el, index) => {
      if (el !== model.background) {
        const ijk = getIJK(index, dims);

        // XXX: TODO
        // 1. Create array of x/y offsets, loop over that
        // 2. Make work for arbitrary slice
        // 3. Compute world coordinates properly


        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            if ((x === 0 && y === 0) || (x !== 0 && y !== 0)) continue;

            let dx = x;
            let dy = y;
            let dz = 0;

            if (model.slicingMode === 1) {
              dx = x;
              dy = 0;
              dz = y;
            } 
            else if (model.slicingMode === 0) {
              dx = 0;
              dy = y;
              dz = x;
            }

            const evalX = ijk[kernelX] + dx;
            const evalY = ijk[kernelY] + dy;

            // check boundaries
            if (
              evalX >= 0 &&
              evalX < dims[kernelX] &&
              evalY >= 0 &&
              evalY < dims[kernelY]
            ) {
              const ijk2 = [ijk[0] + dx, ijk[1] + dy, ijk[2] + dz];
              const value = inputDataArray[getIndex(ijk2, dims)];

              if (value !== el) {                
                if (dx === -1) {
                  points.push(ijk[0] - 0.5, ijk[1] - 0.5, ijk[2]);
                  points.push(ijk[0] - 0.5, ijk[1] + 0.5, ijk[2]);
                }
                else if (dx === 1) {
                  points.push(ijk[0] + 0.5, ijk[1] - 0.5, ijk[2]);
                  points.push(ijk[0] + 0.5, ijk[1] + 0.5, ijk[2]);
                }
                else if (dy === -1) {
                  points.push(ijk[0] - 0.5, ijk[1] - 0.5, ijk[2]);
                  points.push(ijk[0] + 0.5, ijk[1] - 0.5, ijk[2]);
                }
                else if (dy === 1) {
                  points.push(ijk[0] - 0.5, ijk[1] + 0.5, ijk[2]);
                  points.push(ijk[0] + 0.5, ijk[1] + 0.5, ijk[2]);
                }

                lines.push(2, points.length / 3 - 2, points.length / 3 - 1);
              }
            }
          }
        }
      }
    });

    // Update output
    const polydata = vtkPolyData.newInstance();
    polydata.getPoints().setData(new Float32Array(points), 3);
    polydata.getLines().setData(new Uint32Array(lines));
  
    outData[0] = polydata;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  slicingMode: 2,
  slice: 0
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 1, 1);
  macro.setGet(publicAPI, model, ['slicingMode', 'slice']);
  vtkImageContour(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkImageContour');

// ----------------------------------------------------------------------------

export default { newInstance, extend };