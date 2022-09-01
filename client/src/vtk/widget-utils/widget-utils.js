export const getLabel = (model, callData) => {
  const imageData = model.factory.getImageData();

  if (!imageData) return null;

  const worldCoords = model.manipulator.handleEvent(
    callData,
    model.apiSpecificRenderWindow
  );

  const bounds = imageData.getBounds();

  // Check x and y position
  if (worldCoords[0] < bounds[0] || worldCoords[0] > bounds[1] ||
      worldCoords[1] < bounds[2] || worldCoords[1] > bounds[3]) {
    return null;
  }

  // Make sure in a slice
  worldCoords[2] = Math.max(bounds[4], Math.min(worldCoords[2], bounds[5]));

  const value = imageData.getScalarValueFromWorld(worldCoords);

  return isNaN(value) ? null : value;
};