export const toPixelCenter = (v, spacing, max) => {
  if (v < -spacing / 2) v = -spacing / 2;
  else if (v > max - spacing * 1.5) v = max - spacing * 1.5
  
  return Math.floor((v - spacing / 2) / spacing) * spacing + spacing;
};

export const getImageLabel = (model, callData) => {  
  const imageData = model._factory.getImageData();

  if (!imageData) return null;

  const worldCoords = model.manipulator.handleEvent(
    callData,
    model._apiSpecificRenderWindow
  );

  const bounds = imageData.getBounds();

  // Check x and y position
  worldCoords[0] = Math.max(bounds[0] + 0.5, Math.min(worldCoords[0], bounds[1] - 0.5));
  worldCoords[1] = Math.max(bounds[2] + 0.5, Math.min(worldCoords[1], bounds[3] - 0.5));
  worldCoords[2] = Math.max(bounds[4] + 0.5, Math.min(worldCoords[2], bounds[5] - 0.5));

  const value = imageData.getScalarValueFromWorld(worldCoords);

  return isNaN(value) ? null : value;
};

export const getSurfaceLabel = (model, callData) => {
  const p = callData.position;

  const picker = model.interactor.getPicker();
  picker.pick([p.x, p.y, p.z], model.renderer);

  const id = picker.getCellId();

  if (id > -1) {
    const data = picker.getDataSet();

    // XXX: This works because we know they are triangles. 
    // Using vtk cell accesor didn't work properly. 
    // Maybe try again after updating vtk version.
    const p = data.getPolys().getData()[id * 4 + 1];

    if (data) {
      return data.getPointData().getArray(0).getTuple(p)[0];
    }
  }

  return null;
};