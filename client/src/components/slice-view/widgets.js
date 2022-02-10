import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/brush-widget';

export function Widgets(painter, onEdit) {
  const manager = vtkWidgetManager.newInstance();
  const floodWidget = vtkBrushWidget.newInstance();
  const eraseWidget = vtkBrushWidget.newInstance();
  let floodHandle = null;
  let eraseHandle = null;

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      floodHandle = manager.addWidget(floodWidget, ViewTypes.SLICE);
      eraseHandle = manager.addWidget(eraseWidget, ViewTypes.SLICE);
    
      manager.grabFocus(floodWidget);
    
      floodHandle.onStartInteractionEvent(() => {
        painter.startStroke();
      });

      floodHandle.onEndInteractionEvent(async () => {
        painter.paintFloodFill(floodHandle.getPoints());

        await painter.endStroke();
  
        onEdit();
      });

      eraseHandle.onStartInteractionEvent(() => {
        painter.startStroke();
      });

      eraseHandle.onEndInteractionEvent(async () => {
        painter.erase(eraseHandle.getPoints());

        await painter.endStroke();

        onEdit();
      });
    },
    update: (position, spacing) => {
      floodWidget.getManipulator().setOrigin(position);
      floodWidget.setRadius(0.5 * Math.max(...spacing));
      
      floodHandle.updateRepresentationForRender();

      eraseWidget.getManipulator().setOrigin(position);
      eraseWidget.setRadius(0.5 * Math.max(...spacing));
      
      floodHandle.updateRepresentationForRender();
    },
    setImageData: imageData => {
      floodWidget.setImageData(imageData);
      eraseWidget.setImageData(imageData);
    },
    setEditMode: editMode => {
      if (!floodHandle) return;

      manager.grabFocus(editMode === 'erase' ? eraseWidget : floodWidget);

      floodHandle.setVisibility(editMode === 'paint');
      eraseHandle.setVisibility(editMode === 'erase');

      floodHandle.updateRepresentationForRender();
      eraseHandle.updateRepresentationForRender();
    }
  }
}