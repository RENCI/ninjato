import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/brush-widget';
import vtkCropWidget from 'vtk/crop-widget';
import vtkRegionSelectWidget from 'vtk/region-select-widget';

const setBrush = (handle, brush) => {
  handle.getRepresentations()[0].setBrush(brush);
};

const createWidget = type => type.newInstance();

export function Widgets(painter, onEdit, onHover) {
  const manager = vtkWidgetManager.newInstance();

  const widgets = {
    paint: createWidget(vtkBrushWidget),
    erase: createWidget(vtkBrushWidget),
    crop: createWidget(vtkCropWidget),
    select: createWidget(vtkRegionSelectWidget),
    claim: createWidget(vtkRegionSelectWidget)
  }; 

  let handles = null;

  let activeWidget = null;

/*
  const paintWidget = vtkBrushWidget.newInstance();
  const eraseWidget = vtkBrushWidget.newInstance();
  const cropWidget = vtkCropWidget.newInstance();
  const selectWidget = vtkRegionSelectWidget.newInstance();
  const claimWidget = vtkRegionSelectWidget.newInstance();

  const widgets = [
    selectWidget,
    claimWidget,
    paintWidget,
    eraseWidget,
    cropWidget
  ];

  let activeWidget = null;
  
  let paintHandle = null;
  let eraseHandle = null;
  let cropHandle = null;
  let selectHandle = null;
  let claimHandle = null;

  let handles = [];
*/  

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      handles = Object.entries(widgets).reduce((handles, [key, value]) => {
        handles[key] = manager.addWidget(value, ViewTypes.SLICE);
        return handles;
      }, {});
    
      activeWidget = widgets.paint;
      manager.grabFocus(activeWidget);

      // Start
      [handles.paint, handles.erase, handles.crop].forEach(handle => {
        handle.onStartInteractionEvent(() => painter.startStroke());
      });

      // Interaction
      [widgets.select, widgets.claim].forEach(widgets => {
        const startLabel = widgets.getStartLabel();
        const label = widgets.getLabel();        

        if (startLabel === null || (startLabel !== null && startLabel === label)) {
          onHover(label);
        }
        else {
          onHover(null);
        }
      });

      // End
      handles.paint.onEndInteractionEvent(async () => {
        painter.paintFloodFill(
          handles.paint.getPoints(), 
          handles.paint.getRepresentations()[0].getBrush()
        );

        await painter.endStroke();
  
        onEdit();
      });

      handles.erase.onEndInteractionEvent(async () => {
        painter.erase(
          handles.erase.getPoints(), 
          handles.erase.getRepresentations()[0].getBrush()
        );

        await painter.endStroke(true);

        onEdit();
      });

      handles.crop.onEndInteractionEvent(async () => {
        const handle = handles.crop.getWidgetState().getState().handle;
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

      [widgets.select, widgets.claim].forEach(widget => {
        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (startLabel !== null && label === startLabel) {
          //onLink(label);
          console.log("STUFF");
        }
      });
    },
    update: (position, spacing) => {      
      // XXX: Why is the 0.85 necessary here?
      const radius = Math.max(spacing[0], spacing[1]) * 0.85;  

      Object.values(widgets).forEach(widget => widget.getManipulator().setOrigin(position));

      [widgets.paint, widgets.erase].forEach(widget => widget.setRadius(radius));

      Object.values(handles).forEach(handle => handle.updateRepresentationForRender());
    },
    setImageData: imageData => {
      Object.values(widgets).forEach(widget => widget.setImageData(imageData))    
    },
    setEditMode: editMode => {
      const position = activeWidget.getPosition();

      activeWidget = widgets[editMode];

      manager.grabFocus(activeWidget);

      activeWidget.setPosition(position);

      Object.values(widgets).forEach(widget => {
        widget.setVisibility(widget === activeWidget);
      });      
    },
    setPaintBrush: brush => setBrush(handles.paint, brush),
    setEraseBrush: brush => setBrush(handles.erase, brush),
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      Object.values(widgets).forEach(widget => widget.delete());
    }
  }
}