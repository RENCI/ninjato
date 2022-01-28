import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
//import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';
import vtkFloodWidget from 'vtk/flood-widget';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

export function Widgets(painter, onEdit) {
  const manager = vtkWidgetManager.newInstance();
  const floodWidget = vtkFloodWidget.newInstance();
  let paintHandle = null;

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      paintHandle = manager.addWidget(floodWidget, ViewTypes.SLICE);

      console.log(floodWidget);
      console.log(paintHandle);
    
      manager.grabFocus(floodWidget);
    
      paintHandle.onStartInteractionEvent(() => {
        painter.startStroke();
        painter.addPoint(floodWidget.getWidgetState().getTrueOrigin());
      });
    
      paintHandle.onInteractionEvent(() => {
        painter.addPoint(floodWidget.getWidgetState().getTrueOrigin());
      });

      paintHandle.onEndInteractionEvent(async () => {
        //console.log(paintHandle.getPoints());
        //painter.paintFloodFill(paintHandle.getPoints());

        await painter.endStroke();
  
        onEdit();
      });
    },
    update: (position, spacing) => {
      floodWidget.getManipulator().setOrigin(position);
      floodWidget.setRadius(1 * Math.max(...spacing));
      
      paintHandle.updateRepresentationForRender();
    }
  }
}