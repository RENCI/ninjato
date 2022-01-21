import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

export function Widgets(renderer, painter, onEdit) {
  const widgetManager = vtkWidgetManager.newInstance();
  widgetManager.setRenderer(renderer);

  // Widgets
  const paintWidget = vtkPaintWidget.newInstance();

  const paintHandle = widgetManager.addWidget(
    paintWidget,
    ViewTypes.SLICE
  );

  widgetManager.grabFocus(paintWidget);

  const initializeHandle = handle => {
    handle.onStartInteractionEvent(() => {
      painter.startStroke();
    });
    handle.onEndInteractionEvent(async () => {
      await painter.endStroke();

      onEdit();
    });
  };

  paintHandle.onStartInteractionEvent(() => {
    painter.startStroke();
    painter.addPoint(paintWidget.getWidgetState().getTrueOrigin());
  });

  paintHandle.onInteractionEvent(() => {
    painter.addPoint(paintWidget.getWidgetState().getTrueOrigin());
  });

  initializeHandle(paintHandle);

  return {
    paintWidget: paintWidget,
    paintHandle: paintHandle
  }
}