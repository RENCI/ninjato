import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';
import { toPixelCenter, getImageLabel } from 'vtk/widgets/widget-utils';

export default function widgetBehavior(publicAPI, model) {
  model.painting = model._factory.getPainting();

  publicAPI.getPoints = () => 
    model.representations[0].getOutputData().getPoints().getData();

  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.activeState || !model.activeState.getActive()) {
      return macro.VOID;
    }

    model.painting = true;
    if (model._factory.getShowTrail()) {
      const trail = model.widgetState.addTrail();
      trail.set(
        model.activeState.get('origin', 'up', 'right', 'direction')
      );
      trail.setScale1(model._factory.getImageData().getSpacing()[0]);
    }
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
    const manipulator =
      model.activeState?.getManipulator?.() ?? model.manipulator;
    if (manipulator && model.activeState && model.activeState.getActive()) {
      const normal = model._camera.getDirectionOfProjection();
      const up = model._camera.getViewUp();
      const right = [];
      vec3.cross(right, up, normal);
      model.activeState.setUp(...up);
      model.activeState.setRight(...right);
      model.activeState.setDirection(...normal);

      const worldCoords = manipulator.handleEvent(
        callData,
        model._apiSpecificRenderWindow
      );

      // XXX: Magic value based highlight region used in MaskPainter
      worldCoords[2] -= 0.4;

      if (worldCoords.length) {
        const imageData = model._factory.getImageData();

        if (imageData) {
          const ijk = imageData.worldToIndex([...worldCoords]);
          const dims = imageData.getDimensions();
          const spacing = imageData.getSpacing();

          worldCoords[0] = toPixelCenter(ijk[0], spacing[0], dims[0]);
          worldCoords[1] = toPixelCenter(ijk[1], spacing[1], dims[1]);

          model.activeState.setOrigin(...worldCoords);

          if (model._factory.getShowTrail() && model.painting) {
            const trail = model.widgetState.addTrail();
            trail.set(
              model.activeState.get(
                'origin',
                'up',
                'right',
                'direction'
              )
            );
            trail.setScale1(spacing[0]);
          }
        }
      }
      
      model._factory.setLabel(getImageLabel(model, callData));    

      publicAPI.invokeInteractionEvent();
      return macro.EVENT_ABORT;
    }
    return macro.VOID;
  };

  publicAPI.grabFocus = () => {
    if (!model.hasFocus) {
      model.activeState = model.widgetState.getHandle();
      model.activeState.activate();
      model._interactor.requestAnimation(publicAPI);

      const canvas = model._apiSpecificRenderWindow.getCanvas();
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
      model._interactor.cancelAnimation(publicAPI);
    }
    model.widgetState.deactivate();
    model.widgetState.getHandle().deactivate();
    model.activeState = null;
    model.hasFocus = false;
  };

  macro.get(publicAPI, model, ['painting']);
}
