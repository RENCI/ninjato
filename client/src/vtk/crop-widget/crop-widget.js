import macro from '@kitware/vtk.js/macros';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';
import vtkPlanePointManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import vtkRectangleContextRepresentation from '@kitware/vtk.js/Widgets/Representations/RectangleContextRepresentation';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import widgetBehavior from './behavior';
import stateGenerator from './state';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkCropWidget(publicAPI, model) {
  model.classHierarchy.push('vtkCropWidget');

  // --- Widget Requirement ---------------------------------------------------
  model.behavior = widgetBehavior;
  model.widgetState = stateGenerator();

  publicAPI.getRepresentationsForViewType = (viewType) => {
    switch (viewType) {
      case ViewTypes.DEFAULT:
      case ViewTypes.GEOMETRY:
      case ViewTypes.SLICE:
      case ViewTypes.VOLUME:
      default:
        return [
          {
            builder: vtkRectangleContextRepresentation,
            labels: ['handle'],
          },
        ];
    }
  };
  // --- Widget Requirement ---------------------------------------------------

  const handle = model.widgetState.getHandle();

  // Default manipulator
  model.manipulator = vtkPlanePointManipulator.newInstance();
  handle.setManipulator(model.manipulator);
} 

// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  manipulator: null,
  imageData: null,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['manipulator', 'imageData']);

  vtkCropWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkCropWidget');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
