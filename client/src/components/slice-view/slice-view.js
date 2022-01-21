import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';
import vtkInteractorStyleImage  from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

const sliceMode = vtkImageMapper.SlicingMode.K;

function Widgets(renderer, painter, onEdit) {
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

function Image() {
  let mapper = vtkImageMapper.newInstance();
  mapper.setSlicingMode(sliceMode);

  let actor = vtkImageSlice.newInstance();
  actor.setMapper(mapper);

  return {
    actor: actor,
    mapper: mapper,
    setInputData: data => {
      mapper.setInputData(data);

      const extent = data.getExtent();          
      mapper.setSlice((extent[5] - extent[4]) / 2);
    },
    cleanUp: () => {
      actor.delete();
      mapper.delete();
    }
  }
}

function Mask(painter) {
  const mapper = vtkImageMapper.newInstance();
  const actor = vtkImageSlice.newInstance();
  const cfun = vtkColorTransferFunction.newInstance();
  const ofun = vtkPiecewiseFunction.newInstance();

  actor.setMapper(mapper);
  mapper.setInputConnection(painter.getOutputPort());

  cfun.addRGBPoint(1, 0, 0, 1); // label "1" will be blue
  ofun.addPoint(0, 0); // our background value, 0, will be invisible
  ofun.addPoint(1, 1); // all values above 1 will be fully opaque

  actor.getProperty().setRGBTransferFunction(cfun);
  actor.getProperty().setPiecewiseFunction(ofun);
  actor.getProperty().setOpacity(0.5);

  return {
    actor: actor,
    mapper: mapper
  };
}

const setCamera = (sliceMode, renderer, data) => {
  const ijk = [0, 0, 0];
  const position = [0, 0, 0];
  const focalPoint = [0, 0, 0];
  data.indexToWorld(ijk, focalPoint);
  ijk[sliceMode] = 1;
  data.indexToWorld(ijk, position);
  renderer.getActiveCamera().set({ focalPoint, position });
  renderer.resetCamera();
};

export function SliceView() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let camera = null;
  let widgets = null;

  const painter = vtkPaintFilter.newInstance();
  painter.setSlicingMode(sliceMode);
  painter.setLabel(1);

  const image = Image();
  const labelMap = Mask(painter);

  return {
    initialize: (rootNode, onEdit) => {
      if (fullScreenRenderWindow) return;

      fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: rootNode,
        background: [0.9, 0.9, 0.9]
      });

      renderWindow = fullScreenRenderWindow.getRenderWindow();
      renderer = fullScreenRenderWindow.getRenderer();
      camera = renderer.getActiveCamera();

      // Setup 2D view
      camera.setParallelProjection(true);

      const iStyle = vtkInteractorStyleImage.newInstance();
      iStyle.setInteractionMode('IMAGE_SLICING');
      renderWindow.getInteractor().setInteractorStyle(iStyle);

      widgets = Widgets(renderer, painter, onEdit);
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);

      renderer.addViewProp(image.actor);
      renderer.addViewProp(labelMap.actor);
    
      // update paint filter
      painter.setBackgroundImage(imageData);
      painter.setLabelMap(maskData);
    
      // set 2D camera position
      setCamera(sliceMode, renderer, imageData);
    
      const update = () => {  
        const slicingMode = image.mapper.getSlicingMode() % 3;

        if (slicingMode > -1) {
          const ijk = [0, 0, 0];
          const position = [0, 0, 0];
    
          // position
          ijk[slicingMode] = image.mapper.getSlice();
          imageData.indexToWorld(ijk, position);
    
          widgets.paintWidget.getManipulator().setOrigin(position);

          painter.setSlicingMode(slicingMode);
    
          widgets.paintHandle.updateRepresentationForRender();
    
          // update labelMap layer
          labelMap.mapper.set(image.mapper.get('slice', 'slicingMode'));
        }
      };

      image.mapper.onModified(update);
      // trigger initial update
      update();   
    },
    cleanUp: () => {
      console.log("Clean up");
    }
  };
}