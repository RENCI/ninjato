import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

export function Widgets(painter, onEdit) {
  const manager = vtkWidgetManager.newInstance();
  const paintWidget = vtkPaintWidget.newInstance();
  let paintHandle = null;

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      paintHandle = manager.addWidget(paintWidget, ViewTypes.SLICE);
    
      manager.grabFocus(paintWidget);
    
      paintHandle.onStartInteractionEvent(() => {
        painter.startStroke();
        painter.addPoint(paintWidget.getWidgetState().getTrueOrigin());
      });
    
      paintHandle.onInteractionEvent(() => {
        painter.addPoint(paintWidget.getWidgetState().getTrueOrigin());
      });

      paintHandle.onEndInteractionEvent(async () => {
        await painter.endStroke();
  
        onEdit();
      });
    },
    update: (position, spacing) => {
      paintWidget.getManipulator().setOrigin(position);
      paintWidget.setRadius(0.75 * Math.max(...spacing));
      
      paintHandle.updateRepresentationForRender();
    }
  }
}