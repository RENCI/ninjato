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

    const getIJK = (index, dims) => {
      const ijk = [0, 0, 0];
      ijk[0] = index % dims[0];
      ijk[1] = Math.floor(index / dims[0]) % dims[1];
      ijk[2] = Math.floor(index / (dims[0] * dims[1]));
      return ijk;
    };

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
    const w = model.width / 2;

    const toPixelCenter = (v, max) => 
      v === max - 1 ? max - 2 + 0.5 : (Math.floor(v * max / (max - 1)) + 0.5) * (max - 1) / max;

    inputDataArray.forEach((el, index) => {
      if (el !== 0) {
        const ijk = getIJK(index, dims);

        if (ijk[kernelZ] !== model.slice) return;

        offsets.forEach(({ dx, dy }) => {
          const evalX = ijk[kernelX] + dx;
          const evalY = ijk[kernelY] + dy;

          // Check boundaries
          let value = 0;
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

            value = inputDataArray[getIndex(ijk2, dims)];
          }

          if (value !== el) {                
            const p = input.indexToWorld(ijk);
            const px = toPixelCenter(p[kernelX], dims[kernelX]) + dx * halfSpacing[kernelX];
            const py = toPixelCenter(p[kernelY], dims[kernelY]) + dy * halfSpacing[kernelY];
            const pz = p[kernelZ];

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
              
            points.push(...p1, ...p2, ...p3, ...p4);
            values.push(el, el, el, el);
          }
        });
      }
    });

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
  slice: 0,
  width: 0.2
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);
  macro.algo(publicAPI, model, 1, 1);
  macro.setGet(publicAPI, model, ['slicingMode', 'slice', 'width']);
  vtkImageContour(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkImageContour');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };