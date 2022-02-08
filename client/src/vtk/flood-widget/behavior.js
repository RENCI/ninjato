import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';

export default function widgetBehavior(publicAPI, model) {
  model.painting = model.factory.getPainting();

  publicAPI.getPoints = () => 
    model.representations[0].getOutputData().getPoints().getData();

  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.activeState || !model.activeState.getActive()) {
      return macro.VOID;
    }

    model.painting = true;
    const trailCircle = model.widgetState.addTrail();
    trailCircle.set(
      model.activeState.get('origin', 'up', 'right', 'direction', 'scale1')
    );
    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleMouseMove = (callData) => publicAPI.handleEvent(callData);

  publicAPI.handleLeftButtonRelease = () => {
    if (model.painting) {
      publicAPI.invokeEndInteractionEvent();
      model.widgetState.clearTrailList();
    }
    model.painting = false;
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

      const worldCoords = model.manipulator.handleEvent(
        callData,
        model.apiSpecificRenderWindow
      );

      if (worldCoords.length) {
        const imageData = model.factory.getImageData();

        if (imageData) {
          const ijk = imageData.worldToIndex([...worldCoords]);
          const dims = imageData.getDimensions();

          // XXX: Assuming pixel spacing of 1 in X and Y?
          const toPixelCenter = (v, max) => (Math.floor(v * max / (max - 1)) + 0.5) * (max - 1) / max;

          worldCoords[0] = toPixelCenter(ijk[0], dims[0]);
          worldCoords[1] = toPixelCenter(ijk[1], dims[1]);
        }

        model.widgetState.setTrueOrigin(...worldCoords);
        model.activeState.setOrigin(...worldCoords);

        if (model.painting) {
          const trailCircle = model.widgetState.addTrail();
          trailCircle.set(
            model.activeState.get(
              'origin',
              'up',
              'right',
              'direction',
              'scale1'
            )
          );
        }
      }

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

  macro.get(publicAPI, model, ['painting']);
}
