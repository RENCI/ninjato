import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkBrush3DWidget from 'vtk/widgets/brush-3d-widget';
import vtkRegionSelect3DWidget from 'vtk/widgets/region-select-3d-widget';

const createWidget = type => type.newInstance();

const actionValid = ({ region, inStartRegion, inAssignment }) =>
  region && inStartRegion && inAssignment;

const notActiveValid = ({ region, inStartRegion, inAssignment}, activeRegion) => 
  region && inStartRegion && inAssignment && region !== activeRegion;

const claimValid = ({ region, inStartRegion }) =>
  region?.info?.status === 'inactive' && inStartRegion;
  
const brush = [[1]];

export function Widgets(painter) {
  // Callbacks
  let onEdit = () => {};
  let onSelect = () => {};
  let onWidgetMove = () => {};
  let onHover = () => {};
  let onHighlight = () => {};

  const manager = vtkWidgetManager.newInstance();

  const widgets = {
    paint: createWidget(vtkBrush3DWidget),
    erase: createWidget(vtkBrush3DWidget),
    select: createWidget(vtkRegionSelect3DWidget),
    split: createWidget(vtkRegionSelect3DWidget),
    merge: createWidget(vtkRegionSelect3DWidget),
    delete: createWidget(vtkRegionSelect3DWidget),
    claim: createWidget(vtkRegionSelect3DWidget),
    remove: createWidget(vtkRegionSelect3DWidget),
    visibility: createWidget(vtkRegionSelect3DWidget)
  }; 

  widgets.erase.setMode('erase');

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
        case 'widgetMove': onWidgetMove = callback; break;
        case 'hover': onHover = callback; break;
        case 'highlight': onHighlight = callback; break;
        default: 
          console.warn(`Unknown callback type: ${ type }`);
      }
    },
    setRenderer: renderer => {
      manager.setRenderer(renderer);
      
      handles = Object.entries(widgets).reduce((handles, [key, value]) => {
        handles[key] = manager.addWidget(value, ViewTypes.GEOMETRY);
        return handles;
      }, {});
    
      activeWidget = widgets.paint;
      manager.grabFocus(activeWidget);      

      // Hover
      // There can be multiple handlers registered for a given widget.
      // Use same hover for all, and widget-specific for highlighting as needed below.
      Object.entries(handles).forEach(([name, handle]) => {          
        const widget = widgets[name];

        if (widget.getPosition) {
          handle.onInteractionEvent(() => {
            onWidgetMove(widget.getPosition());
          });
        }

        if (widget.getLabel) {
          handle.onInteractionEvent(() => {
            const { label, region } = getWidgetInfo(widget);
            
            if (label !== hoverLabel) {
              hoverLabel = label;
              onHover(region);
            }
          });
        }
      });

      // Interaction overrides
      handles.select.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.select);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(notActiveValid(info, activeRegion) ? info.region : null);
        }
      });

      handles.visibility.onInteractionEvent(() => {
        const info = getWidgetInfo(widgets.visibility);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          onHighlight(info.region);
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
        painter.startStroke();

        painter.paint(handles.paint.getPoint(), brush);

        await painter.endStroke();

        onEdit(activeRegion);
      });

      handles.erase.onEndInteractionEvent(async () => {
        painter.startStroke();

        // Use paint
        painter.paint(
          handles.erase.getPoint(), brush);

        // Set erase to true
        await painter.endStroke(true);

        onEdit(activeRegion);
      });

      handles.select.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.select);

        if (notActiveValid(info, activeRegion)) {
          onSelect(info.region, 'select');
        }
      });

      handles.visibility.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.visibility);

        onSelect(info.region, 'visibility');
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

      handles.delete.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.delete);

        if (actionValid(info)) {
          onSelect(info.region, 'delete');
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
    },    
    setImageData: imageData => {
      // XXX: Why is the 0.85 necessary here?
      //const radius = Math.max(spacing[0], spacing[1]) * 0.85;
      const radius = 0.85;

      [widgets.paint, widgets.erase].forEach(widget => {
        widget.setRadius(radius);
        widget.setImageData(imageData);
      });

      [handles.paint, handles.erase].forEach(handle =>
        handle.getRepresentations()[0].setLengths(...imageData.getSpacing())
      );

      Object.values(handles).forEach(handle => handle.updateRepresentationForRender());
    },    
    setTool: tool => {
      if (tool) {
        // XXX: Maybe want a previous widget to handle this?
        const position = activeWidget ? activeWidget.getPosition() : [0, 0, 0];
  
        activeWidget = widgets[tool];
  
        manager.grabFocus(activeWidget);
        manager.enablePicking();
  
        activeWidget.setPosition(position);
      }
      else {
        activeWidget = null;
        manager.grabFocus(null);
        manager.disablePicking();
      }

      Object.values(widgets).forEach(widget => {
        widget.setVisibility(widget === activeWidget);
      });      
    },
    setRegions: (assignment, background) => {
      regions = assignment;
      backgroundRegions = background;
    },
    setActiveRegion: region => {
      activeRegion = region;
    },
    setPosition: position => {
      if (activeWidget) activeWidget.setPosition(position);
    },
    mouseOut: () => {
      hoverLabel = null;
      if (activeWidget) activeWidget.setPosition(null);
    },
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      Object.values(widgets).forEach(widget => widget.delete());
    }
  }
}