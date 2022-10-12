import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';
import { getImageLabel } from 'vtk/widget-utils';

const toPixelCenter = (v, spacing, max) => {
  if (v < 0) v = 0;
  else if (v > max - 1) v = max - 1.5;
  
  return (Math.floor(v * max / (max - 1)) + 0.5) * spacing * (max - 1) / max;
};

export default function widgetBehavior(publicAPI, model) {
  model.handle = model.widgetState.getHandle();

  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.activeState || !model.activeState.getActive()) {
      return macro.VOID;
    }

    model.cropping = true;

    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleMouseMove = (callData) => publicAPI.handleEvent(callData);

  publicAPI.handleLeftButtonRelease = () => {
    if (model.cropping) {
      publicAPI.invokeEndInteractionEvent();
    }
    model.cropping = false;
    return model.hasFocus ? macro.EVENT_ABORT : macro.VOID;
  };

  publicAPI.handleEvent = (callData) => {
    if (
      model._manipulator &&
      model.activeState &&
      model.activeState.getActive()
    ) {
      const normal = model._camera.getDirectionOfProjection();
      const up = model._camera.getViewUp();
      const right = [];
      vec3.cross(right, up, normal);
      model.activeState.setUp(...up);
      model.activeState.setRight(...right);
      model.activeState.setDirection(...normal);
      model._manipulator.setNormal(normal);

      const worldCoords = model._manipulator.handleEvent(
        callData,
        model.apiSpecificRenderWindow
      );

      if (worldCoords.length) {
        const imageData = model.factory.getImageData();

        if (imageData) {
          const ijk = imageData.worldToIndex([...worldCoords]);
          const dims = imageData.getDimensions();
          const spacing = imageData.getSpacing();

          worldCoords[0] = toPixelCenter(ijk[0], spacing[0], dims[0]);
          worldCoords[1] = toPixelCenter(ijk[1], spacing[1], dims[1]);

          const dx = spacing[0] / 2;
          const dy = spacing[1] / 2;

          if (!model.cropping) {
            model.handle.setOrigin(
              worldCoords[0] - dx,
              worldCoords[1] - dy,
              worldCoords[2]
            );
          }

          const o = model.handle.getOrigin();
          const c = model.handle.getCorner();

          model.handle.setCorner(
            worldCoords[0] + (c[0] >= o[0] ? dx : -dx), 
            worldCoords[1] + (c[1] >= o[1] ? dy : -dy), 
            worldCoords[2]
          );
        }
      }

      model.factory.setLabel(getImageLabel(model, callData));  

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
