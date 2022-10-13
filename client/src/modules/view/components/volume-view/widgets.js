import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkRegionSelect3DWidget from 'vtk/widgets/region-select-3d-widget';

const createWidget = type => type.newInstance();

const actionValid = ({ region, inStartRegion, inAssignment }) =>
  region && inStartRegion && inAssignment;

const notActiveValid = ({ region, inStartRegion, inAssignment}, activeRegion) => 
  region && inStartRegion && inAssignment && region !== activeRegion;

const claimValid = ({ region, inStartRegion }) =>
  region?.info?.status === 'inactive' && inStartRegion;

export function Widgets(painter) {
  // Callbacks
  let onSelect = () => {};

  const manager = vtkWidgetManager.newInstance();

  const widgets = {
    select: createWidget(vtkRegionSelect3DWidget),
    split: createWidget(vtkRegionSelect3DWidget),
    merge: createWidget(vtkRegionSelect3DWidget),
    delete: createWidget(vtkRegionSelect3DWidget),
    claim: createWidget(vtkRegionSelect3DWidget),
    remove: createWidget(vtkRegionSelect3DWidget)
  }; 

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
        case 'select': onSelect = callback; break;
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
    
      activeWidget = widgets.select;
      manager.grabFocus(activeWidget);

      // Interaction overrides
      handles.select.onInteractionEvent(() => {
        /*
        const info = getWidgetInfo(widgets.select);

        if (info.label !== highlightLabel) {
          highlightLabel = info.label;

          //onHighlight(notActiveValid(info, activeRegion) ? info.region : null);
        }
        */
      });

      // End
      handles.select.onEndInteractionEvent(() => {
        const info = getWidgetInfo(widgets.select);

        if (notActiveValid(info, activeRegion)) {
          onSelect(info.region, 'select');
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
    update: (position) => {      
      Object.values(widgets).forEach(widget => widget.getManipulator().setOrigin(position));
      Object.values(handles).forEach(handle => handle.updateRepresentationForRender());
    },
    /*
    setImageData: imageData => {
      Object.values(widgets).forEach(widget => widget.setImageData(imageData));
    },
    */
    setTool: tool => {
      if (tool) {
        // XXX: Maybe want a previous widget to handle this?
        const position = activeWidget ? activeWidget.getPosition() : [0, 0, 0];
  
        activeWidget = widgets[tool];
  
        manager.grabFocus(activeWidget);
  
        activeWidget.setPosition(position);
      }
      else {
        activeWidget = null;
        manager.grabFocus(null);
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
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      Object.values(widgets).forEach(widget => widget.delete());
    }
  }
}