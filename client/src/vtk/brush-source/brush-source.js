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

    // Get number of pixels
    const brush = model.brush;

    // Points - dynamic array
    const points = [];

    // Cells - dynamic array
    const lines = [];

    // Create brush  
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];
    const jOffset = -Math.floor(brush.length / 2);
    for (let j = 0; j < brush.length; j++) {
      const cy = j + jOffset;
      const iOffset = -Math.floor(brush[j].length / 2);
      for (let i = 0; i < brush[j].length; i++) {
        const cx = i + iOffset;

        if (brush[j][i] > 0) {
          for (let k = 0; k < offsets.length; k++) {
            const dx = offsets[k][0];
            const dy = offsets[k][1];

            const ni = i + dx
            const nj = j + dy;

            if (ni < 0 || ni > brush[j].length - 1 ||
                nj < 0 || nj > brush.length - 1 ||
                brush[nj][ni] === 0) {
              const p1 = [];
              const p2 = [];

              if (dx === 0) {
                p1[0] = cx - 0.5;
                p1[1] = cy + dy * 0.5;
                p1[2] = 0;

                p2[0] = cx + 0.5;
                p2[1] = p1[1];
                p2[2] = 0;
              }
              else {
                p1[0] = cx + dx * 0.5;;
                p1[1] = cy - 0.5;
                p1[2] = 0;

                p2[0] = p1[0];
                p2[1] = cy + 0.5
                p2[2] = 0;
              }

              points.push(...p1, ...p2);

              const np = points.length / 3;
              lines.push(2, np - 2, np - 1);
            }
          }
        }
      }
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
  brush: [[1]],
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
