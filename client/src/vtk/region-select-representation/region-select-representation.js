import macro from '@kitware/vtk.js/macros';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkContextRepresentation from '@kitware/vtk.js/Widgets/Representations/ContextRepresentation';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';

import { vec3 } from 'gl-matrix';

// ----------------------------------------------------------------------------
// vtkRegionSelectRepresentation methods
// ----------------------------------------------------------------------------

function vtkRegionSelectRepresentation(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkRegionSelectRepresentation');

  // --------------------------------------------------------------------------
  // Generic rendering pipeline
  // --------------------------------------------------------------------------

  model.mapper = vtkMapper.newInstance();
  model.actor = vtkActor.newInstance({ parentProp: publicAPI });

  model.mapper.setInputConnection(publicAPI.getOutputPort());
  model.actor.setMapper(model.mapper);
  model.actor.getProperty().setColor(1, 1, 1);

  publicAPI.addActor(model.actor);  

  // --------------------------------------------------------------------------

  publicAPI.requestData = (inData, outData) => {
    if (model.deleted) {
      return;
    }

    const list = publicAPI.getRepresentationStates(inData[0]);
    const state = list[0];

    const dataset = vtkPolyData.newInstance();
/*
    if (state.getVisible() && state.getOrigin()) {
      const point1 = state.getOrigin();
      const point2 = state.getCorner();
      const diagonal = [0, 0, 0];
      vec3.subtract(diagonal, point2, point1);
      const up = state.getUp();
      const upComponent = vec3.dot(diagonal, up);

      const points = new Float32Array(4 * 3);
      points[0] = point1[0];
      points[1] = point1[1];
      points[2] = point1[2];
      points[3] = point1[0] + upComponent * up[0];
      points[4] = point1[1] + upComponent * up[1];
      points[5] = point1[2] + upComponent * up[2];
      points[6] = point2[0];
      points[7] = point2[1];
      points[8] = point2[2];
      points[9] = point2[0] - upComponent * up[0];
      points[10] = point2[1] - upComponent * up[1];
      points[11] = point2[2] - upComponent * up[2];

      dataset.getPoints().setData(points, 3);

      const line = new Uint32Array([5, 0, 1, 2, 3, 0]);
      dataset.getLines().setData(line, 1);
    } else {
      dataset.getPoints().setData([], 0);
      dataset.getPolys().setData([], 0);
      dataset.getLines().setData([], 0);
    }
*/
    outData[0] = dataset;
  };

  publicAPI.getSelectedState = (prop, compositeID) => model.state;
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkContextRepresentation.extend(publicAPI, model, initialValues);
  macro.setGet(publicAPI, model, []);
  macro.get(publicAPI, model, ['mapper', 'actor']);

  // Object specific methods
  vtkRegionSelectRepresentation(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkRegionSelectRepresentation'
);

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };