import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrushWidget from 'vtk/widgets/brush-widget';
import vtkCropWidget from 'vtk/widgets/crop-widget';
import vtkRegionSelectWidget from 'vtk/widgets/region-select-widget';

const setBrush = (handle, brush) => {  
  handle.getRepresentations()[0].setBrush(brush);
};

const setColor = (handle, color) => {
  handle.getRepresentations()[0].setColor(color);
};

const createWidget = type => type.newInstance();

const actionValid = ({ region, inStartRegion, inAssignment }) =>
  region && inStartRegion && inAssignment;

const notActiveValid = ({ region, inStartRegion, inAssignment}, activeRegion) => 
  region && inStartRegion && inAssignment && region !== activeRegion;

const claimValid = ({ region, inStartRegion }) =>
  region?.info?.status === 'inactive' && inStartRegion;

export function Widgets(painter) {
  // Callbacks
  let onEdit = () => {};
  let onSelect = () => {};
  let onHover = () => {};
  let onHighlight = () => {};

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
  let backgroundRegions = [];
  let activeRegion = null;
  let hoverLabel = null;
  let highlightLabel = null;

  const getRegion = label => {
    const region = regions.concat(backgroundRegions).find(region => region.label === label);
    return region ? region : null;
  };

  const getWidgetInfo = widget => {
    const startLabel = widget.getStartLabel ? widget.getStartLabel() : null;
    const label = widget.getLabel();

    return {
      label: widget.getLabel(),
      region: getRegion(label),
      inStartRegion: (startLabel === null || label === startLabel) && label !== 0,
      inAssignment: Boolean (regions.find(region => region.label === label))
    };
  };

  return {
    setCallback: (type, callback) => {
      switch (type) {
        case 'edit': onEdit = callback; break;
        case 'select': onSelect = callback; break;
        case 'hover': onHover = callback; break;
        case 'highlight': onHighlight = callback; break;
        default: 
          console.warn(`Unknown callback type: ${ type }`);
      }
    },
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

      // Hover
      // There can be multiple handlers registered for a given widget.
      // Use same hover for all, and widget-specific for highlighting as needed below.
      Object.entries(handles).forEach(([name, handle]) => {          
        const widget = widgets[name];

        if (!widget.getLabel) return;

        handle.onInteractionEvent(() => {
          const { label, region } = getWidgetInfo(widget);
          
          if (label !== hoverLabel) {
            hoverLabel = label;
            onHover(region);
          }
        });
      });

      // Interaction overrides
      handles.select.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.select);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(notActiveValid(info, activeRegion) ? info.region : null);
        }
      });

      handles.claim.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.claim);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(claimValid(info) ? info.region : null);
        }
      });

      handles.remove.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.remove);
        
        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(actionValid(info) ? info.region : null);
        }
      });

      handles.split.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.split);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(actionValid(info) ? info.region : null);
        }
      });

      handles.merge.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.merge);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(notActiveValid(info, activeRegion) ? info.region : null);
        }
      });

      handles.delete.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.delete);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(actionValid(info) ? info.region : null);
        }
      });

      // End
      handles.paint.onEndInteractionEvent(async () => {
        painter.paintFloodFill(
          handles.paint.getPoints(), 
          handles.paint.getRepresentations()[0].getBrush()
        );

        await painter.endStroke();
  
        onEdit(activeRegion);
      });

      handles.erase.onEndInteractionEvent(async () => {
        // Use paint
        painter.paint(
          handles.erase.getPoints(), 
          handles.erase.getRepresentations()[0].getBrush()
        );

        // Set erase to true
        await painter.endStroke(true);

        onEdit(activeRegion);
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

        onEdit(activeRegion);
      });

      handles.select.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.select);

        if (notActiveValid(info, activeRegion)) {
          onSelect(info.region, 'select');
        }
      });

      handles.claim.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.claim);

        if (claimValid(info)) {
          onSelect({ label: info.label }, 'claim');
        }
      });

      handles.remove.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.remove);

        if (actionValid(info)) {
          onSelect(info.region, 'remove');
        }
      });

      handles.split.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.split);

        if (actionValid(info)) {
          onSelect(info.region, 'split');
        }
      });

      handles.merge.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.merge);

        if (notActiveValid(info, activeRegion)) {
          onSelect(info.region, 'merge');
        }
      });

      handles.create.onEndInteractionEvent(() => {
        onSelect(null, 'create');
      });

      handles.delete.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.delete);

        if (actionValid(info)) {
          onSelect(info.region, 'delete');
        }
      });
    },
    update: (position, spacing) => {      
      // XXX: Why is the 0.85 necessary here?
      const radius = Math.max(spacing[0], spacing[1]) * 0.85;

      Object.values(widgets).forEach(widget => widget.getManipulator().setWidgetOrigin(position));

      [widgets.paint, widgets.erase, widgets.create].forEach(widget => widget.setRadius(radius));

      Object.values(handles).forEach(handle => handle.updateRepresentationForRender());
    },
    setImageData: imageData => {
      Object.values(widgets).forEach(widget => widget.setImageData(imageData));
    },
    setTool: tool => {
      if (tool) {
        // XXX: Maybe want a previous widget to handle this?
        const position = activeWidget ? activeWidget.getPosition() : [0, 0, 0];

        activeWidget = widgets[tool];

        // Need to enable widget because it may have been disabled below
        activeWidget.getWidgetForView({ viewId: manager.getViewId() }).setEnabled(true);
        manager.grabFocus(activeWidget);
        manager.enablePicking();

        activeWidget.setPosition(position);
      }
      else {
        activeWidget = null;
        manager.grabFocus(null);
        manager.disablePicking();

        // For some reason neither grabFocus(null) nor releaseFocus are working properly.
        // This workaround disables all widgets here, requiring the newly active widget to be enabled above.
        Object.values(widgets).forEach(w => {
          const widget = w.getWidgetForView({ viewId: manager.getViewId() });
          widget.setEnabled(false);
        });
      }

      Object.values(widgets).forEach(widget => {
        widget.setVisibility(widget === activeWidget);
      });      
    },
    setBrush: (type, brush) => setBrush(handles[type], brush),
    setRegions: (assignment, background) => {
      regions = assignment;
      backgroundRegions = background;
    },
    setActiveRegion: region => {
      activeRegion = region;

      const color = region ? region.colors.contourActive : '#fff';
      setColor(handles.paint, color);
      setColor(handles.erase, color);
      setColor(handles.crop, color);
    },
    mouseOut: () => {
      hoverLabel = null;
      highlightLabel = null;
      if (activeWidget) activeWidget.setPosition(null);
    },
    createRegion: async () => {
      painter.startStroke();

      painter.paintFloodFill(
        widgets.create.getEventPos(),
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