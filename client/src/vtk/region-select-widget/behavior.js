import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';

const getLabel = (model, callData) => {
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

export default function widgetBehavior(publicAPI, model) {
  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.activeState || !model.activeState.getActive()) {
      return macro.VOID;
    }   

    const label = getLabel(model, callData);
    model.factory.setStartLabel(label);
    model.factory.setLabel(label);
    
    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleMouseMove = (callData) => publicAPI.handleEvent(callData);

  publicAPI.handleLeftButtonRelease = () => {
    if (model.factory.getStartLabel() !== null) {      
      publicAPI.invokeEndInteractionEvent();
    }
    model.factory.setStartLabel(null);
    model.factory.setLabel(null);
    return model.hasFocus ? macro.EVENT_ABORT : macro.VOID;
  };

  publicAPI.handleEvent = (callData) => {
    if (
      model.manipulator &&
      model.activeState &&
      model.activeState.getActive()
    ) {
      const normal = model.camera.getDirectionOfProjection();
      const up = model.camera.getViewUp();
      const right = [];
      vec3.cross(right, up, normal);
      model.activeState.setUp(...up);
      model.activeState.setRight(...right);
      model.activeState.setDirection(...normal);
      model.manipulator.setNormal(normal);

      model.factory.setLabel(getLabel(model, callData));       

      publicAPI.invokeInteractionEvent();
      return macro.EVENT_ABORT;
    }
    return macro.VOID;
  };

  publicAPI.grabFocus = () => {
    if (!model.hasFocus) {
      model.activeState = model.widgetState.getHandle();
      model.activeState.activate();
      model.interactor.requestAnimation(publicAPI);

      const canvas = model.apiSpecificRenderWindow.getCanvas();
      canvas.onmouseenter = () => {
        if (
          model.hasFocus &&
          model.activeState === model.widgetState.getHandle()
        ) {
          model.activeState.setVisible(true);
        }
      };
      canvas.onmouseleave = () => {
        if (
          model.hasFocus &&
          model.activeState === model.widgetState.getHandle()
        ) {
          model.activeState.setVisible(false);
        }
      };
    }
    model.hasFocus = true;
  };

  publicAPI.loseFocus = () => {
    if (model.hasFocus) {
      model.interactor.cancelAnimation(publicAPI);
    }
    model.widgetState.deactivate();
    model.widgetState.getHandle().deactivate();
    model.activeState = null;
    model.hasFocus = false;
  };
}
