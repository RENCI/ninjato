import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/brush-widget';
import vtkCropWidget from 'vtk/crop-widget';
import vtkRegionSelectWidget from 'vtk/region-select-widget';

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
    remove: createWidget(vtkRegionSelectWidget),
    split: createWidget(vtkRegionSelectWidget),
    merge: createWidget(vtkRegionSelectWidget),
    create: createWidget(vtkBrushWidget),
    delete: createWidget(vtkRegionSelectWidget) 
  }; 

  widgets.create.setShowTrail(false);

  let handles = null;

  let activeWidget = null; 

  let regions = [];
  let activeRegion = null;

  const getRegion = label => regions.find(region => region.label === label);

  const getSelectInfo = widget => {
    const startLabel = widget.getStartLabel();
    const label = widget.getLabel();

    return {
      inRegion: (startLabel === null || label === startLabel) && label !== 0,
      region: getRegion(label)
    };
  };

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
      handles.select.onInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.select);

        if (inRegion && region && region !== activeRegion) {
          onHover(region);
        }
        else {
          onHover(null);
        }
      });

      handles.claim.onInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.claim);

        if (inRegion && !region) {          
          onHover(region);
        }
        else {
          onHover(null);
        }
      });

      handles.remove.onInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.remove);

        if (inRegion && region) {          
          onHover(region);
        }
        else {
          onHover(null);
        }
      });

      handles.split.onInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.split);

        if (inRegion && region) {          
          onHover(region);
        }
        else {
          onHover(null);
        }
      });

      handles.merge.onInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.split);

        if (inRegion && region && region !== activeRegion) {          
          onHover(region);
        }
        else {
          onHover(null);
        }
      });

      handles.delete.onInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.split);

        if (inRegion && region) {          
          onHover(region);
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

      handles.select.onEndInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.select);

        if (inRegion && region && region !== activeLabel) {
          onSelect(region, 'select');
        }
      });

      handles.claim.onEndInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.claim);

        if (inRegion && !region) {
          onSelect(region, 'claim');
        }
      });

      handles.remove.onEndInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.remove);

        if (inRegion && region) {
          onSelect(label, 'remove');
        }
      });

      handles.split.onEndInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.split);

        if (inRegion && region) {
          onSelect(region, 'split');
        }
      });

      handles.merge.onEndInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.split);

        if (inRegion && region && region !== activeRegion) {
          onSelect(label, 'merge');
        }
      });

      handles.create.onEndInteractionEvent(() => {
        onSelect(null, 'create');
      });

      handles.delete.onEndInteractionEvent(() => {
        const { inRegion, region } = getSelectInfo(widgets.split);

        if (inRegion && region) {
          onSelect(region, 'delete');
        }
      });
    },
    update: (position, spacing) => {      
      // XXX: Why is the 0.85 necessary here?
      const radius = Math.max(spacing[0], spacing[1]) * 0.85;  

      Object.values(widgets).forEach(widget => widget.getManipulator().setOrigin(position));

      [widgets.paint, widgets.erase, widgets.create].forEach(widget => widget.setRadius(radius));

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
    setRegions: regionArray => {
      regions = regionArray;
    },
    setActiveRegion: region => {
      activeRegion = region;

      const color = region.colors.contourActive;
      setColor(handles.paint, color);
      setColor(handles.erase, color);
      setColor(handles.crop, color);
    },
    createRegion: async () => {
      painter.startStroke();

      painter.paintFloodFill(
        handles.create.getPoints(), 
        handles.create.getRepresentations()[0].getBrush()
      );

      const promise = painter.endStroke();    
      await promise;

      onEdit();

      return promise;
    },
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      Object.values(widgets).forEach(widget => widget.delete());
    }
  }
}