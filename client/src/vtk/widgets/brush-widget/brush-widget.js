import macro from '@kitware/vtk.js/macros';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';
import vtkPlaneManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushRepresentation from 'vtk/widgets/brush-representation';
import widgetBehavior from './behavior';
import stateGenerator from './state';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkBrushWidget(publicAPI, model) {
  model.classHierarchy.push('vtkBrushWidget');

  const superClass = { ...publicAPI };

  // --- Widget Requirement ---------------------------------------------------
  model.behavior = widgetBehavior;
  model.widgetState = stateGenerator(model.radius);

  publicAPI.getRepresentationsForViewType = (viewType) => {
    switch (viewType) {
      case ViewTypes.DEFAULT:
      case ViewTypes.GEOMETRY:
      case ViewTypes.SLICE:
      case ViewTypes.VOLUME:
      default:
        return [
          {
            builder: vtkBrushRepresentation,
            labels: ['handle', 'trail']
          },
        ];
    }
  };

  // --- Public methods -------------------------------------------------------

  publicAPI.setManipulator = (manipulator) => {
    superClass.setManipulator(manipulator);
    model.widgetState.getHandle().setManipulator(manipulator);
  };

  // override
  const superSetRadius = publicAPI.setRadius;
  publicAPI.setRadius = (r) => {
    if (superSetRadius(r)) {
      model.widgetState.getHandle().setScale1(r);
    }
  };

  publicAPI.setPosition = (position) => {
    model.widgetState.getHandle().setOrigin(position);
  };

  publicAPI.getPosition = () => {
    return model.widgetState.getHandle().getOrigin();
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
  radius: 1,
  painting: false,
  color: [1],
  imageData: null,
  showTrail: true,
  label: null,
  behavior: widgetBehavior,
  widgetState: stateGenerator(),
  ...initialValues
});

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, defaultValues(initialValues));

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);

  macro.get(publicAPI, model, ['painting']);
  macro.setGet(publicAPI, model, ['manipulator', 'radius', 'color', 'imageData', 'showTrail', 'label']);

  vtkBrushWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkBrushWidget');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
