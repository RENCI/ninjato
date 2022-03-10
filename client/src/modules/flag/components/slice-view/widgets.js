import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkRegionSelectWidget from 'vtk/region-select-widget';

export function Widgets(onLink, onHover) {
  const manager = vtkWidgetManager.newInstance();
  const linkWidget = vtkRegionSelectWidget.newInstance();
  
  let linkHandle = null;

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      linkHandle = manager.addWidget(linkWidget, ViewTypes.SLICE);
    
      manager.grabFocus(linkWidget);

      linkHandle.onStartInteractionEvent(() => {
        const label = linkWidget.getLabel();

        onHover(label);
      });

      linkHandle.onInteractionEvent(() => {
        const startLabel = linkWidget.getStartLabel();
        const label = linkWidget.getLabel();        

        if (startLabel === null || (startLabel !== null && startLabel === label)) {
          onHover(label);
        }
        else {
          onHover(null);
        }
      });

      linkHandle.onEndInteractionEvent(() => {
        const startLabel = linkWidget.getStartLabel();
        const label = linkWidget.getLabel();

        if (startLabel !== null && label === startLabel) {
          onLink(label);
        }
      });
    },
    update: position => { 
      linkWidget.getManipulator().setOrigin(position);
      
      linkHandle.updateRepresentationForRender();
    },
    setImageData: imageData => {
      linkWidget.setImageData(imageData);    
    },
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      linkWidget.delete();
    }
  }
}