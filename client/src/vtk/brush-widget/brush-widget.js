import macro from '@kitware/vtk.js/macros';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';
import vtkPlaneManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import vtkSphereHandleRepresentation from '@kitware/vtk.js/Widgets/Representations/SphereHandleRepresentation';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushRepresentation from 'vtk/brush-representation';
import widgetBehavior from './behavior';
import stateGenerator from './state';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkBrushWidget(publicAPI, model) {
  model.classHierarchy.push('vtkBrushWidget');

  // --- Widget Requirement ---------------------------------------------------
  model.behavior = widgetBehavior;
  model.widgetState = stateGenerator(model.radius, model.brush);

  publicAPI.getRepresentationsForViewType = (viewType) => {
    switch (viewType) {
      case ViewTypes.DEFAULT:
      case ViewTypes.GEOMETRY:
      case ViewTypes.SLICE:
        return [
          {
            builder: vtkBrushRepresentation,
            labels: ['handle', 'trail'],
          },
        ];
      case ViewTypes.VOLUME:
      default:
        return [{ builder: vtkSphereHandleRepresentation, labels: ['handle'] }];
    }
  };
  // --- Widget Requirement ---------------------------------------------------

  const handle = model.widgetState.getHandle();

  // Default manipulator
  model.manipulator = vtkPlaneManipulator.newInstance();
  handle.setManipulator(model.manipulator);

  // override
  const superSetRadius = publicAPI.setRadius;
  publicAPI.setRadius = (r) => {
    if (superSetRadius(r)) {
      handle.setScale1(r);
    }
  };
}

// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  manipulator: null,
  radius: 1,
  painting: false,
  color: [1],
  imageData: null,
  brush: [[1]]
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);

  macro.get(publicAPI, model, ['painting']);
  macro.setGet(publicAPI, model, ['manipulator', 'radius', 'color', 'imageData', 'brush']);

  vtkBrushWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkBrushWidget');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
