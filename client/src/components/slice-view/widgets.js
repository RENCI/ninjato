import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkFloodWidget from 'vtk/flood-widget';

export function Widgets(painter, onEdit) {
  const manager = vtkWidgetManager.newInstance();
  const floodWidget = vtkFloodWidget.newInstance();
  let floodHandle = null;

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      floodHandle = manager.addWidget(floodWidget, ViewTypes.SLICE);
    
      manager.grabFocus(floodWidget);
    
      floodHandle.onStartInteractionEvent(() => {
        painter.startStroke();
      });

      floodHandle.onEndInteractionEvent(async () => {
        painter.paintFloodFill(floodHandle.getPoints());

        await painter.endStroke();
  
        onEdit();
      });
    },
    update: (position, spacing) => {
      floodWidget.getManipulator().setOrigin(position);
      floodWidget.setRadius(0.5 * Math.max(...spacing));
      
      floodHandle.updateRepresentationForRender();
    }
  }
}