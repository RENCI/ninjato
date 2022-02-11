import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/brush-widget';

const setBrush = (handle, brush) => {
  handle.getRepresentations()[0].setBrush(brush);
};

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
        painter.paintFloodFill(
          floodHandle.getPoints(), 
          floodHandle.getRepresentations()[0].getBrush()
        );

        await painter.endStroke();
  
        onEdit();
      });

      eraseHandle.onStartInteractionEvent(() => {
        painter.startStroke();
      });

      eraseHandle.onEndInteractionEvent(async () => {
        painter.erase(
          eraseHandle.getPoints(), 
          eraseHandle.getRepresentations()[0].getBrush()
        );

        await painter.endStroke(true);

        onEdit();
      });
    },
    update: (position, spacing) => {
      // XXX: Why is the 0.85 necessary here?
      const radius = Math.max(spacing[0], spacing[1]) * 0.85;
 
      floodWidget.getManipulator().setOrigin(position);
      floodWidget.setRadius(radius);
      
      floodHandle.updateRepresentationForRender();

      eraseWidget.getManipulator().setOrigin(position);
      eraseWidget.setRadius(radius);
      
      eraseHandle.updateRepresentationForRender();
    },
    setImageData: imageData => {
      floodWidget.setImageData(imageData);
      eraseWidget.setImageData(imageData);
    },
    setEditMode: editMode => {
      manager.grabFocus(editMode === 'erase' ? eraseWidget : floodWidget);

      floodHandle.setVisibility(editMode === 'paint');
      eraseHandle.setVisibility(editMode === 'erase');

      floodHandle.updateRepresentationForRender();
      eraseHandle.updateRepresentationForRender();
    },
    setPaintBrush: brush => setBrush(floodHandle, brush),
    setEraseBrush: brush => setBrush(eraseHandle, brush)
  }
}