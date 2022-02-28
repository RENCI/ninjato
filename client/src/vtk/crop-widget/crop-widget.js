import macro from '@kitware/vtk.js/macros';
import vtkPlanePointManipulator from '@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator';
import vtkShapeWidget from '@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget';
import vtkSphereHandleRepresentation from '@kitware/vtk.js/Widgets/Representations/SphereHandleRepresentation';
import vtkRectangleContextRepresentation from '@kitware/vtk.js/Widgets/Representations/RectangleContextRepresentation';
import vtkSVGLandmarkRepresentation from '@kitware/vtk.js/Widgets/SVG/SVGLandmarkRepresentation';

import widgetBehavior from './behavior';
import stateGenerator from './state';

import {
  BehaviorCategory,
  ShapeBehavior,
} from '@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget/Constants';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------

function vtkCropWidget(publicAPI, model) {
  model.classHierarchy.push('vtkCropWidget');

  model.methodsToLink = [
    ...model.methodsToLink,
    'activeScaleFactor',
    'activeColor',
    'useActiveColor',
    'drawBorder',
    'drawFace',
    'opacity',
  ];

  // --- Widget Requirement ---------------------------------------------------

  model.behavior = widgetBehavior;
  publicAPI.getRepresentationsForViewType = (viewType) => {
    switch (viewType) {
      case ViewTypes.DEFAULT:
      case ViewTypes.GEOMETRY:
      case ViewTypes.SLICE:
      case ViewTypes.VOLUME:
      default:
        return [
          {
            builder: vtkSphereHandleRepresentation,
            labels: ['moveHandle'],
            initialValues: {
              scaleInPixels: true,
            },
          },
          {
            builder: vtkRectangleContextRepresentation,
            labels: ['rectangleHandle'],
          },
          {
            builder: vtkSVGLandmarkRepresentation,
            initialValues: {
              showCircle: false,
              text: '',
            },
            labels: ['SVGtext'],
          },
        ];
    }
  };

  // --------------------------------------------------------------------------
  // initialization
  // --------------------------------------------------------------------------

  // Default manipulator
  model.manipulator = vtkPlanePointManipulator.newInstance();
  model.widgetState = stateGenerator();
}

// ----------------------------------------------------------------------------

function defaultValues(initalValues) {
  return {
    modifierBehavior: {
      None: {
        [BehaviorCategory.PLACEMENT]:
          ShapeBehavior[BehaviorCategory.PLACEMENT].CLICK_AND_DRAG,
        [BehaviorCategory.POINTS]:
          ShapeBehavior[BehaviorCategory.POINTS].CORNER_TO_CORNER,
        [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FREE,
      },
      Shift: {
        [BehaviorCategory.RATIO]: ShapeBehavior[BehaviorCategory.RATIO].FIXED,
      },
      Control: {
        [BehaviorCategory.POINTS]:
          ShapeBehavior[BehaviorCategory.POINTS].CENTER_TO_CORNER,
      },
    },
    ...initalValues,
  };
}

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  vtkShapeWidget.extend(publicAPI, model, defaultValues(initialValues));
  macro.setGet(publicAPI, model, ['manipulator', 'widgetState']);

  vtkCropWidget(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkCropWidget');

// ----------------------------------------------------------------------------

export default { newInstance, extend };