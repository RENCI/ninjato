import macro from '@kitware/vtk.js/macros';
import { vec3 } from 'gl-matrix';

export default function widgetBehavior(publicAPI, model) {
  publicAPI.handleLeftButtonPress = (callData) => {
    if (!model.activeState || !model.activeState.getActive()) {
      return macro.VOID;
    }   
/*
    const label = getLabel(model, callData);
    model.factory.setStartLabel(label);
    model.factory.setLabel(label);
*/    

    
    const p = callData.position;

    const picker = model.interactor.getPicker();
    picker.pick([p.x, p.y, p.z], model.renderer);

    const id = picker.getCellId();

    const data = picker.getDataSet();

    console.log(data);

    console.log(picker);
    console.log(id);

    data.getPointData().getArrays().forEach(d => {
      console.log(d.getName());
    });

    if (id > -1) {
      console.log(data.getPointData().getArray(0).getTuple(id));
    }

    //const label = data.getPointData().getAbstractArray(0).getVariantValue(cell->GetPointId(0));

    publicAPI.invokeStartInteractionEvent();
    return macro.EVENT_ABORT;
  };

  publicAPI.handleMouseMove = (callData) => publicAPI.handleEvent(callData);

  publicAPI.handleLeftButtonRelease = () => {
    if (model.factory.getStartLabel() !== null) {      
      publicAPI.invokeEndInteractionEvent();
    }
/*    
    model.factory.setStartLabel(null);
    model.factory.setLabel(null);
*/    
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

//      model.factory.setLabel(getLabel(model, callData));       

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