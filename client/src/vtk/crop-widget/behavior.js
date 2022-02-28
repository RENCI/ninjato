import shapeBehavior from '@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget/behavior';

export default function widgetBehavior(publicAPI, model) {
  model.shapeHandle = model.widgetState.getRectangleHandle();
  model.point1Handle = model.widgetState.getPoint1Handle();
  model.point2Handle = model.widgetState.getPoint2Handle();
  model.point1Handle.setManipulator(model.manipulator);
  model.point2Handle.setManipulator(model.manipulator);

  // We inherit shapeBehavior
  shapeBehavior(publicAPI, model);
  const superClass = { ...publicAPI };

  model.classHierarchy.push('vtkCropWidgetProp');

  publicAPI.setCorners = (point1, point2) => {
    if (superClass.setCorners) {
      superClass.setCorners(point1, point2);
    }
    model.shapeHandle.setOrigin(point1);
    model.shapeHandle.setCorner(point2);
  };
}