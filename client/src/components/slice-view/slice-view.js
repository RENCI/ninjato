import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';
import vtkSplineWidget from '@kitware/vtk.js/Widgets/Widgets3D/SplineWidget';
import vtkInteractorStyleImage  from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

let initialized = false;

const scene = {};
const widgets = {};
const painter = vtkPaintFilter.newInstance();
const image = {};
const labelMap = {};

const initializeScene = rootNode => {
    // ----------------------------------------------------------------------------
    // Standard rendering code setup
    // ----------------------------------------------------------------------------

    scene.fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: rootNode,
      background: [0.9, 0.9, 0.9]
    });

    scene.renderer = scene.fullScreenRenderer.getRenderer();
    scene.renderWindow = scene.fullScreenRenderer.getRenderWindow();
    scene.apiSpecificRenderWindow = scene.fullScreenRenderer
      .getInteractor()
      .getView();
    scene.camera = scene.renderer.getActiveCamera();

    // setup 2D view
    scene.camera.setParallelProjection(true);
    scene.iStyle = vtkInteractorStyleImage.newInstance();
    scene.iStyle.setInteractionMode('IMAGE_SLICING');
    scene.renderWindow.getInteractor().setInteractorStyle(scene.iStyle);
};

const initializeWidgets = () => {
  // ----------------------------------------------------------------------------
  // Widget manager and vtkPaintFilter
  // ----------------------------------------------------------------------------

  scene.widgetManager = vtkWidgetManager.newInstance();
  scene.widgetManager.setRenderer(scene.renderer);

  // Widgets
  widgets.paintWidget = vtkPaintWidget.newInstance();
  widgets.splineWidget = vtkSplineWidget.newInstance({
    resetAfterPointPlacement: true,
  });
  widgets.polygonWidget = vtkSplineWidget.newInstance({
    resetAfterPointPlacement: true,
    resolution: 1,
  });

  scene.paintHandle = scene.widgetManager.addWidget(
    widgets.paintWidget,
    ViewTypes.SLICE
  );
  scene.splineHandle = scene.widgetManager.addWidget(
    widgets.splineWidget,
    ViewTypes.SLICE
  );
  scene.polygonHandle = scene.widgetManager.addWidget(
    widgets.polygonWidget,
    ViewTypes.SLICE
  );

  scene.splineHandle.setOutputBorder(true);
  scene.polygonHandle.setOutputBorder(true);

  scene.widgetManager.grabFocus(widgets.paintWidget);

  const initializeHandle = handle => {
    handle.onStartInteractionEvent(() => {
      painter.startStroke();
    });
    handle.onEndInteractionEvent(() => {
      painter.endStroke();
    });
  };

  scene.paintHandle.onStartInteractionEvent(() => {
    painter.startStroke();
    painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
  });

  scene.paintHandle.onInteractionEvent(() => {
    painter.addPoint(widgets.paintWidget.getWidgetState().getTrueOrigin());
  });
  initializeHandle(scene.paintHandle);

  scene.splineHandle.onEndInteractionEvent(() => {
    const points = scene.splineHandle.getPoints();
    painter.paintPolygon(points);

    scene.splineHandle.updateRepresentationForRender();
  });
  initializeHandle(scene.splineHandle);

  scene.polygonHandle.onEndInteractionEvent(() => {
    const points = scene.polygonHandle.getPoints();
    painter.paintPolygon(points);

    scene.polygonHandle.updateRepresentationForRender();
  });
  initializeHandle(scene.polygonHandle);
};

const initializeImage = () => {
  image.imageMapper = vtkImageMapper.newInstance();

  image.actor = vtkImageSlice.newInstance();
  image.actor.setMapper(image.imageMapper);
};

const initializeMask = () => {
  labelMap.imageMapper = vtkImageMapper.newInstance();
  labelMap.actor = vtkImageSlice.newInstance();
  labelMap.cfun = vtkColorTransferFunction.newInstance();
  labelMap.ofun = vtkPiecewiseFunction.newInstance();

  // labelmap pipeline
  labelMap.actor.setMapper(labelMap.imageMapper);
  labelMap.imageMapper.setInputConnection(painter.getOutputPort());

  // set up labelMap color and opacity mapping
  labelMap.cfun.addRGBPoint(1, 0, 0, 1); // label "1" will be blue
  labelMap.ofun.addPoint(0, 0); // our background value, 0, will be invisible
  labelMap.ofun.addPoint(1, 1); // all values above 1 will be fully opaque

  labelMap.actor.getProperty().setRGBTransferFunction(labelMap.cfun);
  labelMap.actor.getProperty().setPiecewiseFunction(labelMap.ofun);
  // opacity is applied to entire labelmap
  labelMap.actor.getProperty().setOpacity(0.5);
};

const setData = (imageData, maskData) => {
  const data = imageData;
  image.data = data;

  // set input data
  image.imageMapper.setInputData(data);

  // add actors to renderers
  scene.renderer.addViewProp(image.actor);
  scene.renderer.addViewProp(labelMap.actor);

  // update paint filter
  painter.setBackgroundImage(imageData);
  painter.setLabelMap(maskData);
  // don't set to 0, since that's our empty label color from our pwf
  painter.setLabel(1);
  // set custom threshold
  // painter.setVoxelFunc((bgValue, idx) => bgValue < 145);

  // default slice orientation/mode and camera view
  const extent = imageData.getExtent();          
  const sliceMode = vtkImageMapper.SlicingMode.K;
  image.imageMapper.setSlicingMode(sliceMode);
  image.imageMapper.setSlice((extent[5] - extent[4]) / 2);
  painter.setSlicingMode(sliceMode);

  // set 2D camera position
  setCamera(sliceMode, scene.renderer, image.data);

  scene.splineHandle.setHandleSizeInPixels(
    2 * Math.max(...image.data.getSpacing())
  );
  scene.splineHandle.setFreehandMinDistance(
    4 * Math.max(...image.data.getSpacing())
  );

  scene.polygonHandle.setHandleSizeInPixels(
    2 * Math.max(...image.data.getSpacing())
  );
  scene.polygonHandle.setFreehandMinDistance(
    4 * Math.max(...image.data.getSpacing())
  );

  const update = () => {
    const slicingMode = image.imageMapper.getSlicingMode() % 3;

    if (slicingMode > -1) {
      const ijk = [0, 0, 0];
      const position = [0, 0, 0];

      // position
      ijk[slicingMode] = image.imageMapper.getSlice();
      data.indexToWorld(ijk, position);

      widgets.paintWidget.getManipulator().setOrigin(position);
      widgets.splineWidget.getManipulator().setOrigin(position);
      widgets.polygonWidget.getManipulator().setOrigin(position);

      painter.setSlicingMode(slicingMode);

      scene.paintHandle.updateRepresentationForRender();
      scene.splineHandle.updateRepresentationForRender();
      scene.polygonHandle.updateRepresentationForRender();

      // update labelMap layer
      labelMap.imageMapper.set(image.imageMapper.get('slice', 'slicingMode'));
    }
  };
  image.imageMapper.onModified(update);
  // trigger initial update
  update();

};

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

const ready = (scope, picking = false) => {
  scope.renderer.resetCamera();
  scope.fullScreenRenderer.resize();
  if (picking) {
    scope.widgetManager.enablePicking();
  } else {
    scope.widgetManager.disablePicking();
  }
};

const readyAll = () => {
  ready(scene, true);
};

export const sliceView = {
  initialize: (rootNode) => {    
    if (initialized) return;

    initializeScene(rootNode);
    initializeWidgets();
    initializeImage();
    initializeMask();

    initialized = true;
  },
  setData: (imageData, maskData) => {
    setData(imageData, maskData);
  }
};