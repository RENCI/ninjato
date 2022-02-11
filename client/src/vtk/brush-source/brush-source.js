import macro from '@kitware/vtk.js/macros';

import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';

// ----------------------------------------------------------------------------
// vtkBrushSource methods
// ----------------------------------------------------------------------------

function vtkBrushSource(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkBrushSource');

  publicAPI.requestData = (inData, outData) => {
    if (model.deleted) {
      return;
    }

    const dataset = outData[0];

    // Check input
    const pointDataType = dataset
      ? dataset.getPoints().getDataType()
      : model.pointType;
    const pd = vtkPolyData.newInstance();

    // Get number of pixels
    const brush = model.brush;
    const n = brush.reduce((count, row) => count + row.reduce((count, d) => count + (d > 0 ? 1 : 0), 0), 0);

    // Points
    const points = macro.newTypedArray(pointDataType, n * 4 * 3);
    pd.getPoints().setData(points, 3);

    // Cells
    const polys = new Uint32Array(n * 5);
    pd.getPolys().setData(polys, 1);

    // Create points  
    let index = 0;
    const offsets = [
      [-0.5, -0.5], 
      [-0.5, 0.5],
      [0.5, 0.5], 
      [0.5, -0.5]
    ];
    const jOffset = -Math.floor(brush.length / 2);
    for (let j = 0; j < brush.length; j++) {
      const iOffset = -Math.floor(brush[j].length / 2);
      for (let i = 0; i < brush[j].length; i++) {
        if (brush[j][i]) {
          const x = i + iOffset;
          const y = j + jOffset;

          for (let k = 0; k < offsets.length; k++) {
            const offset = offsets[k];
            points[index * 3] = x + offset[0];
            points[index * 3 + 1] = y + offset[1];
            points[index * 3 + 2] = 0;
  
            index++;
          }
        }
      }
    }

    // Create polys
    for (let i = 0; i < n; i++) {
      polys[i * 5] = 4;
      polys[i * 5 + 1] = i * 4;
      polys[i * 5 + 2] = i * 4 + 1;
      polys[i * 5 + 3] = i * 4 + 2;
      polys[i * 5 + 4] = i * 4 + 3;
    }

    // Update output
    outData[0] = pd;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  brush: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
  ],
  pointType: 'Float64Array',
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);
  macro.setGet(publicAPI, model, ['brush']);

  macro.algo(publicAPI, model, 0, 1);
  vtkBrushSource(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkBrushSource');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
