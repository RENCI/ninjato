export default function widgetBehavior(publicAPI, model) {
  model.handle = model.widgetState.getHandle();

  publicAPI.setCorners = (point1, point2) => {
    model.handle.setOrigin(point1);
    model.handle.setCorner(point2);
  };
}
