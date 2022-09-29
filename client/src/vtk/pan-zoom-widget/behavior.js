import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';

export default function widgetBehavior(publicAPI, model) {
  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.button) {
      model.button = 'left';
      model.startPos = callData.position;
      model.startCameraPos = [...model.camera.getPosition()];
      model.startCameraFocalPoint = [...model.camera.getFocalPoint()]
    }

    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleRightButtonPress = (callData) => {
    if (!model.button) {
      model.button = 'right';
      model.startPos = callData.position;
      model.startCameraScale = model.camera.getParallelScale();
    }

    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleMouseMove = (callData) => publicAPI.handleEvent(callData);

  publicAPI.handleLeftButtonRelease = () => {
    publicAPI.invokeEndInteractionEvent();

    if (model.button === 'left') model.button = null;

    return model.hasFocus ? macro.EVENT_ABORT : macro.VOID;
  };

  publicAPI.handleRightButtonRelease = () => {
    publicAPI.invokeEndInteractionEvent();

    if (model.button === 'right') model.button = null;

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

      if (model.button === 'left') {
        const dx = model.startPos.x - callData.position.x;
        const dy = model.startPos.y - callData.position.y;

        const pos = [...model.startCameraPos];

        const s = 0.1;
        pos[0] += dx * s;
        pos[1] -= dy * s;

        model.camera.setPosition(...pos);
        model.camera.setDirectionOfProjection(0, 0, 1);

      }
      else if (model.button === 'right') {
        const dy = model.startPos.y - callData.position.y;

        const s = 0.1;
        const scale = Math.max(1, model.startCameraScale + dy * s);

        model.camera.setParallelScale(scale);
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
}