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

  const widgets = [
    floodWidget,
    eraseWidget,
    cropWidget
  ];

  let activeWidget = null;
  
  let floodHandle = null;
  let eraseHandle = null;
  let cropHandle = null;

  let handles = [];

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      handles = widgets.map(widget => manager.addWidget(widget, ViewTypes.SLICE));
      [floodHandle, eraseHandle, cropHandle] = [...handles];
    
      activeWidget = floodWidget;
      manager.grabFocus(activeWidget);

      handles.forEach(handle => {
        handle.onStartInteractionEvent(() => painter.startStroke());
      });

      floodHandle.onEndInteractionEvent(async () => {
        painter.paintFloodFill(
          floodHandle.getPoints(), 
          floodHandle.getRepresentations()[0].getBrush()
        );

        await painter.endStroke();
  
        onEdit();
      });

      eraseHandle.onEndInteractionEvent(async () => {
        painter.erase(
          eraseHandle.getPoints(), 
          eraseHandle.getRepresentations()[0].getBrush()
        );

        await painter.endStroke(true);

        onEdit();
      });

      cropHandle.onEndInteractionEvent(async () => {
        const handle = cropHandle.getWidgetState().getState().handle;
        const x = [handle.origin[0], handle.corner[0]].sort((a, b) => a - b);
        const y = [handle.origin[1], handle.corner[1]].sort((a, b) => a - b);
        const z = handle.origin[2];

        painter.crop(
          [x[0], y[0], z],
          [x[1], y[1], z]
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

      cropWidget.getManipulator().setOrigin(position);

      cropHandle.updateRepresentationForRender();
    },
    setImageData: imageData => {
      widgets.forEach(widget => widget.setImageData(imageData))    
    },
    setEditMode: editMode => {
      const position = activeWidget.getPosition();

      activeWidget = 
        editMode === 'erase' ? eraseWidget : 
        editMode === 'crop' ? cropWidget :
        floodWidget;

      manager.grabFocus(activeWidget);

      activeWidget.setPosition(position);

      widgets.forEach(widget => {
        widget.setVisibility(widget === activeWidget);
      });
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