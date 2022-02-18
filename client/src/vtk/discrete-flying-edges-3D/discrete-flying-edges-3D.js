import macro from '@kitware/vtk.js/macros';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import algorithm from './algorithm';

const { vtkErrorMacro, vtkDebugMacro } = macro;

// ----------------------------------------------------------------------------
// vtkDiscreteFlyingEdges3D methods
// ----------------------------------------------------------------------------

function vtkDiscreteFlyingEdges3D(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkDiscreteFlyingEdges3D');

  const algo = algorithm();

  publicAPI.requestData = (inData, outData) => {
    // implement requestData
    const input = inData[0];

    if (!input || input.getClassName() !== 'vtkImageData') {
      vtkErrorMacro('Invalid or missing input');
      return;
    }

    // Check dimensions
    const dims = input.getDimensions();
    if (dims[0] === 1 || dims[1] === 1 || dims[2] === 1) {
      vtkErrorMacro('Discrete flying edges 3D requires 3D data');
      return;
    }

    // Check scalars
    if (!input.getPointData().getScalars()) {
      vtkErrorMacro('No scalars for contouring');
    }

    console.time('flying edges');

    // Points
    const pBuffer = [];

    // Cells (triangles)
    const tBuffer = [];

    // Scalars
    const sBuffer = [];

    // Normals
    const nBuffer = [];

    // Gradients
    const gBuffer = [];

    algo.contour(model, input, pBuffer, tBuffer, sBuffer, nBuffer, gBuffer);

    // Update output
    const polydata = vtkPolyData.newInstance();
    polydata.getPoints().setData(new Float32Array(pBuffer), 3);
    polydata.getPolys().setData(new Uint32Array(tBuffer));
    if (model.computeNormals) {
      const nData = new Float32Array(nBuffer);
      const normals = vtkDataArray.newInstance({
        numberOfComponents: 3,
        values: nData,
        name: 'Normals',
      });
      polydata.getPointData().setNormals(normals);
    }
    outData[0] = polydata; 

    console.timeEnd('flying edges');
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  values: [],
  computeNormals: true,
  computeGradients: false,
  computeScalars: true,
  interpolateAttributes: false,
  arrayComponent: 0
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Make this a VTK object
  macro.obj(publicAPI, model);

  // Also make it an algorithm with one input and one output
  macro.algo(publicAPI, model, 1, 1);

  macro.setGet(publicAPI, model, [
    'values',
    'computeNormals',
    'computeGradients',
    'computeScalars',
    'interpolateAttributes',
    'arrayComponent'
  ]);

  // Object specific methods
  macro.algo(publicAPI, model, 1, 1);
  vtkDiscreteFlyingEdges3D(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkDiscreteFlyingEdges3D');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
