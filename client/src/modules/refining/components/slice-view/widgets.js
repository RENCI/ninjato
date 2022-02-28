import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/brush-widget';
import vtkCropWidget from 'vtk/crop-widget';

const setBrush = (handle, brush) => {
  handle.getRepresentations()[0].setBrush(brush);
};

export function Widgets(painter, onEdit) {
  const manager = vtkWidgetManager.newInstance();
  const floodWidget = vtkBrushWidget.newInstance();
  const eraseWidget = vtkBrushWidget.newInstance();
  const cropWidget = vtkCropWidget.newInstance();
  let floodHandle = null;
  let eraseHandle = null;
  let cropHandle = null;

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      floodHandle = manager.addWidget(floodWidget, ViewTypes.SLICE);
      eraseHandle = manager.addWidget(eraseWidget, ViewTypes.SLICE);
      cropHandle = manager.addWidget(cropWidget, ViewTypes.SLICE);
    
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

      cropHandle.onStartInteractionEvent(() => {
        console.log("SUP");
      });

      cropHandle.onEndInteractionEvent(async () => {
        console.log("YO");
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

      cropWidget.getManipulator().setOrigin(position);

      cropHandle.updateRepresentationForRender();
    },
    setImageData: imageData => {
      floodWidget.setImageData(imageData);
      eraseWidget.setImageData(imageData);
//      cropWidget.setImageData(imageData);
    },
    setEditMode: editMode => {
      manager.grabFocus(
        editMode === 'erase' ? eraseWidget : 
        editMode === 'crop' ? cropWidget :
        floodWidget
      );

      floodHandle.setVisibility(editMode === 'paint');
      eraseHandle.setVisibility(editMode === 'erase');
      cropHandle.setVisibility(editMode === 'crop');
      
      // XXX: Need to set all to whatever the active widget is
      if (editMode === 'erase') {
        eraseWidget.setPosition(floodWidget.getPosition());
      }
      else if (editMode === 'crop') {

      }
      else {
        floodWidget.setPosition(eraseWidget.getPosition());
      }

      floodHandle.updateRepresentationForRender();
      eraseHandle.updateRepresentationForRender();
      cropHandle.updateRepresentationForRender();
    },
    setPaintBrush: brush => setBrush(floodHandle, brush),
    setEraseBrush: brush => setBrush(eraseHandle, brush),
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      floodWidget.delete();
      eraseWidget.delete();
      cropWidget.delete();
    }
  }
}