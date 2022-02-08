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

    const kDims = [];
    kDims[0] = dims[kernelX];
    kDims[1] = dims[kernelY];
    kDims[2] = dims[kernelZ];

    const kSpacing = [];
    kSpacing[0] = spacing[kernelX];
    kSpacing[1] = spacing[kernelY];
    kSpacing[2] = spacing[kernelZ];


    const toPixelCenter = (v, max) => (Math.floor(v * max / (max - 1)) + 0.5) * (max - 1) / max;

    inputDataArray.forEach((el, index) => {
      if (el !== model.background) {
        const ijk = getIJK(index, dims);

        offsets.forEach(({ dx, dy }) => {
          const evalX = ijk[kernelX] + dx;
          const evalY = ijk[kernelY] + dy;

          // check boundaries
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

            const value = inputDataArray[getIndex(ijk2, dims)];

            if (value !== el) {                
              const p = input.indexToWorld(ijk);
              const px = toPixelCenter(p[kernelX], kDims[kernelX]);
              const py = toPixelCenter(p[kernelY], kDims[kernelY]);
              const pz = p[kernelZ];

              const p1 = [];
              const p2 = [];
              
              if (dx === 0) {
                p1[kernelX] = px + 0.5;
                p1[kernelY] = py + dy * 0.5;
                p1[kernelZ] = pz;

                p2[kernelX] = px - 0.5;
                p2[kernelY] = py + dy * 0.5;
                p2[kernelZ] = pz;  
              }
              else {
                p1[kernelX] = px + dx * 0.5;
                p1[kernelY] = py + 0.5;
                p1[kernelZ] = pz;

                p2[kernelX] = px + dx * 0.5;
                p2[kernelY] = py - 0.5;
                p2[kernelZ] = pz;    
              }            
                
              points.push(...p1);
              points.push(...p2);
            }
          }
        });
      }
    });

    // Create lines
    for (let i = 0; i < points.length / 2; i++) {
      lines.push(2, i * 2, i * 2 + 1);
    }

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