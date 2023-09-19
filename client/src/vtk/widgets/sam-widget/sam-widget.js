import macro from '@kitware/vtk.js/macros';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';
import vtkPlaneManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkCropRepresentation from 'vtk/widgets/crop-representation';

import widgetBehavior from './behavior';
import stateGenerator from './state';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkCropWidget(publicAPI, model) {
  model.classHierarchy.push('vtkCropWidget');

  const superClass = { ...publicAPI };

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
            builder: vtkCropRepresentation,
            labels: ['handle']
          },
        ];
    }
  };

  // --- Public methods -------------------------------------------------------

  publicAPI.setManipulator = (manipulator) => {
    superClass.setManipulator(manipulator);
    model.widgetState.getHandle().setManipulator(manipulator);
  };

  publicAPI.setPosition = (position) => {  
    if (!position) return;

    const handle = model.widgetState.getHandle();

    if (model.imageData) {
      const spacing = model.imageData.getSpacing();
      handle.setOrigin([
        position[0] - spacing[0] / 2,
        position[1] - spacing[1] / 2,
        position[2]
      ]);
      handle.setCorner([
        position[0] + spacing[0] / 2,
        position[1] + spacing[1] / 2,
        position[2]
      ]);
    }
    else {
      handle.setOrigin(position);
      handle.setCorner(position);
    }
  };

  publicAPI.getPosition = () => {
    const handle = model.widgetState.getHandle();

    if (model.imageData) {
      const spacing = model.imageData.getSpacing();
      const origin = handle.getOrigin();

      return [
        origin[0] + spacing[0] / 2,
        origin[1] + spacing[1] / 2,
        origin[2]
      ];
    }
    else {
      return handle.getOrigin();
    }
  };

  // --------------------------------------------------------------------------
  // initialization
  // --------------------------------------------------------------------------

  // Default manipulator
  publicAPI.setManipulator(
    model.manipulator ||
      vtkPlaneManipulator.newInstance({ useCameraNormal: true })
  );
} 

// ----------------------------------------------------------------------------

const defaultValues = (initialValues) => ({
  // manipulator: null,
  cropping: false,
  imageData: null,
  label: null,
  behavior: widgetBehavior,
  widgetState: stateGenerator(),
  ...initialValues
});

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, defaultValues(initialValues));

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);

  macro.get(publicAPI, model, ['cropping']);
  macro.setGet(publicAPI, model, ['manipulator', 'imageData', 'label']);

  vtkCropWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkCropWidget');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
