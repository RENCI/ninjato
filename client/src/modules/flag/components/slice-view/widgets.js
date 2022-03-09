import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import vtkLinkWidget from 'vtk/link-widget';

export function Widgets(onEdit) {
  const manager = vtkWidgetManager.newInstance();
  const linkWidget = vtkLinkWidget.newInstance();

  const widgets = [
    linkWidget
  ];

  let activeWidget = null;
  
  let linkHandle = null;

  let handles = [];

  return {
    setRenderer: renderer => {
      manager.setRenderer(renderer);

      handles = widgets.map(widget => manager.addWidget(widget, ViewTypes.SLICE));
      [linkHandle] = [...handles];
    
      activeWidget = linkWidget;
      manager.grabFocus(activeWidget);

      handles.forEach(handle => {
        //handle.onStartInteractionEvent(() => painter.startStroke());
      });

      linkHandle.onEndInteractionEvent(async () => {
        //painter.paintFloodFill(
        //  floodHandle.getPoints(), 
        //  floodHandle.getRepresentations()[0].getBrush()
        //);

        //await painter.endStroke();
  
        onEdit();
      });
    },
    update: (position, spacing) => { 
      linkWidget.getManipulator().setOrigin(position);
      
      linkHandle.updateRepresentationForRender();
    },
    setImageData: imageData => {
      widgets.forEach(widget => widget.setImageData(imageData))    
    },
    setEditMode: editMode => {
      const position = activeWidget.getPosition();

      activeWidget = linkWidget;

      manager.grabFocus(activeWidget);

      activeWidget.setPosition(position);

      widgets.forEach(widget => {
        widget.setVisibility(widget === activeWidget);
      });
    },
    cleanUp: () => {
      console.log('Clean up widgets');

      // Clean up anything we instantiated
      manager.delete();
      linkWidget.delete();
    }
  }
}