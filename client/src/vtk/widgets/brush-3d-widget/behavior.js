import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';
//import { getSurfaceLabel } from 'vtk/widgets/widget-utils';

const toVoxelCenter = (p, spacing, extent) => {
  return p.map((v, i) => {
    const s = spacing[i];
    const eMin = extent[i * 2];
    const eMax = extent[i * 2 + 1];

    return Math.max(eMin * s, Math.min(Math.floor((v - s / 2) / s) * s + s, eMax * s));
  });
};

export default function widgetBehavior(publicAPI, model) {
  model.painting = model._factory.getPainting();
  model.pickPosition = [];

  publicAPI.getPoint = () => model.pickPosition;

  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.activeState || !model.activeState.getActive()) {
      return macro.VOID;
    }

    model.painting = true;    


    // XXX: NEED TO SET PICK POSITION HERE?

    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleMouseMove = (callData) => publicAPI.handleEvent(callData);

  publicAPI.handleLeftButtonRelease = () => {
    if (model.painting) {
      publicAPI.invokeEndInteractionEvent();
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

      const p = callData.position;
      const picker = model._interactor.getPicker();
      picker.pick([p.x, p.y, p.z], model._interactor.findPokedRenderer());
      const pos = picker.getPickedPositions();

      model.pickPosition = [];

      if (pos.length > 0) {
        const spacing = model._factory.getImageData().getSpacing();

        let p = pos[0];

        if (model._factory.getMode() === 'paint') {
          // Step back toward the camera for painting
          const camPos = model._camera.getPosition();
          
          const v = [];
          vec3.sub(v, p, camPos);

          const vn = [];
          vec3.normalize(vn, v);

          const ab = vec3.dot(spacing, vn);
          const bb = vec3.dot(vn, vn);

          const s = [];
          vec3.scale(s, vn, Math.abs(ab / bb) * 0.5);

          vec3.sub(v, v, s);

          vec3.add(p, camPos, v);
        }

        model.pickPosition = toVoxelCenter(p, spacing, model._factory.getImageData().getExtent());

        model.activeState.setOrigin(...model.pickPosition);
        
        /*
        const imageData = model._factory.getImageData();

        if (imageData) {
          const ijk = imageData.worldToIndex([...worldCoords]);
          const dims = imageData.getDimensions();
          const spacing = imageData.getSpacing();

          worldCoords[0] = toPixelCenter(ijk[0], spacing[0], dims[0]);
          worldCoords[1] = toPixelCenter(ijk[1], spacing[1], dims[1]);

          //model.activeState.setOrigin(...worldCoords);
        }
        */
        //model.pickPosition = worldCoords;
      }      
      
      //model._factory.setLabel(getImageLabel(model, callData));          

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
