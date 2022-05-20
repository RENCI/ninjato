import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/brush-widget';
import vtkCropWidget from 'vtk/crop-widget';
import vtkRegionSelectWidget from 'vtk/region-select-widget';
import { regionContourColor } from 'utils/colors';

const setBrush = (handle, brush) => {
  handle.getRepresentations()[0].setBrush(brush);
};

const setColor = (handle, color) => {
  handle.getRepresentations()[0].setColor(color);
};

const createWidget = type => type.newInstance();

export function Widgets(painter, onEdit, onSelect, onHover) {
  const manager = vtkWidgetManager.newInstance();

  const widgets = {
    paint: createWidget(vtkBrushWidget),
    erase: createWidget(vtkBrushWidget),
    crop: createWidget(vtkCropWidget),
    select: createWidget(vtkRegionSelectWidget),
    claim: createWidget(vtkRegionSelectWidget),
    split: createWidget(vtkBrushWidget),
    merge: createWidget(vtkRegionSelectWidget)
  }; 

  let handles = null;

  let activeWidget = null; 

  let labels = [];
  let activeLabel = null;

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
      [handles.paint, handles.erase, handles.crop, handles.split].forEach(handle => {
        handle.onStartInteractionEvent(() => painter.startStroke());
      });

      // Interaction
      handles.select.onInteractionEvent(() => {
        const widget = widgets.select;

        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (
          (startLabel === null || label === startLabel) &&           
          labels.includes(label) && 
          label !== activeLabel
        ) {
          onHover(label);
        }
        else {
          onHover(null);
        }
      });

      handles.claim.onInteractionEvent(() => {
        const widget = widgets.claim;

        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (
          (startLabel === null || label === startLabel) &&   
          label !== 0 &&
          !labels.includes(label)
        ) {          
          onHover(label);
        }
        else {
          onHover(null);
        }
      });

      handles.merge.onInteractionEvent(() => {
        const widget = widgets.merge;

        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (
          (startLabel === null || label === startLabel) &&           
          labels.includes(label) && 
          label !== activeLabel
        ) {          
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

      handles.split.onEndInteractionEvent(async () => {
        painter.paintFloodFill(
          handles.split.getPoints(), 
          handles.split.getRepresentations()[0].getBrush()
        );

        await painter.endStroke();
  
        onEdit();
      });

      handles.select.onEndInteractionEvent(() => {
        const widget = widgets.select;

        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (
          startLabel !== null && 
          label === startLabel &&           
          labels.includes(label) && 
          label !== activeLabel
        ) {
          onSelect(label, 'select');
        }
      });

      handles.claim.onEndInteractionEvent(() => {
        const widget = widgets.claim;

        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (
          startLabel !== null && 
          label === startLabel && 
          label !== 0 &&
          !labels.includes(label)
        ) {
          onSelect(label, 'claim');
        }
      });

      handles.merge.onEndInteractionEvent(() => {
        const widget = widgets.split;

        const startLabel = widget.getStartLabel();
        const label = widget.getLabel();

        if (
          startLabel !== null && 
          label === startLabel &&           
          labels.includes(label) && 
          label !== activeLabel
        ) {
          onSelect(label, 'merge');
        }
      });
    },
    update: (position, spacing) => {      
      // XXX: Why is the 0.85 necessary here?
      const radius = Math.max(spacing[0], spacing[1]) * 0.85;  

      Object.values(widgets).forEach(widget => widget.getManipulator().setOrigin(position));

      [widgets.paint, widgets.erase, widgets.split].forEach(widget => widget.setRadius(radius));

      Object.values(handles).forEach(handle => handle.updateRepresentationForRender());
    },
    setImageData: imageData => {
      Object.values(widgets).forEach(widget => widget.setImageData(imageData))    
    },
    setTool: tool => {
      const position = activeWidget.getPosition();

      activeWidget = widgets[tool];

      manager.grabFocus(activeWidget);

      activeWidget.setPosition(position);

      Object.values(widgets).forEach(widget => {
        widget.setVisibility(widget === activeWidget);
      });      
    },
    setBrush: (type, brush) => setBrush(handles[type], brush),
    setLabels: regionLabels => {
      labels = regionLabels;
    },
    setActiveLabel: label => {
      activeLabel = label;

      const color = regionContourColor(labels.indexOf(label));
      setColor(handles.paint, color);
      setColor(handles.erase, color);
    },
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      Object.values(widgets).forEach(widget => widget.delete());
    }
  }
}