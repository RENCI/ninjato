import macro from '@kitware/vtk.js/macros';
import vtkAbstractWidgetFactory from '@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory';
import vtkPlaneManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkRegionSelectRepresentation from 'vtk/widgets/region-select-representation';

import widgetBehavior from './behavior';
import stateGenerator from './state';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkRegionSelect3D(publicAPI, model) {
  model.classHierarchy.push('vtkRegionSelect3D');

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
            builder: vtkRegionSelectRepresentation,
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
  startLabel: null,
  label: null,
  behavior: widgetBehavior,
  widgetState: stateGenerator(),
  ...initialValues
});

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, defaultValues(initialValues));

  vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues);

  macro.get(publicAPI, model, ['selecting']);
  macro.setGet(publicAPI, model, ['manipulator', 'startLabel', 'label']);

  vtkRegionSelect3D(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkLinkWidget');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
