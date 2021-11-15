import { useContext, useRef, useState, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
//import vtkPaintWidget from '@kitware/vtk.js/Widgets/Widgets3D/PaintWidget';
import vtkSplineWidget from '@kitware/vtk.js/Widgets/Widgets3D/SplineWidget';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
import vtkImageOutlineFilter from '@kitware/vtk.js/Filters/General/ImageOutlineFilter';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';

import Manipulators from '@kitware/vtk.js/Interaction/Manipulators';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import { DataContext } from '../contexts';
import { useResize } from '../hooks';

const { SlicingMode } = vtkImageMapper;

export const SliceView = () => {
  const [{ imageData, maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const [context, setContext] = useState(null);
  const { width } = useResize(outerDiv);
     
  // Set up pipeline
  useEffect(() => {   
    if (!context && width) {   
      // Outline
      const painter = vtkPaintFilter.newInstance();
      painter.setLabel(1);
      painter.setSlicingMode(SlicingMode.K);
      painter.setRadius(10);

      const outline = vtkImageOutlineFilter.newInstance();
      outline.setSlicingMode(SlicingMode.K);
      outline.setInputConnection(painter.getOutputPort());

      const outlineMapper = vtkImageMapper.newInstance();
      outlineMapper.setSlicingMode(SlicingMode.K);
      outlineMapper.setInputConnection(painter.getOutputPort());

      const outlineActor = vtkImageSlice.newInstance();
      outlineActor.getProperty().setInterpolationTypeToNearest();
      outlineActor.setMapper(outlineMapper);

      const maxValue = 255;
      const opacity = 0.2;
      const opFun = vtkPiecewiseFunction.newInstance();
      opFun.addPoint(0, 0);
      opFun.addPoint(1, opacity);
      opFun.addPoint(maxValue, opacity);

      const cFun = vtkColorTransferFunction.newInstance();
      cFun.addRGBPoint(1, 1, 0, 0);

      outlineActor.getProperty().setPiecewiseFunction(opFun);
      outlineActor.getProperty().setRGBTransferFunction(cFun);

      // Image
      const imageMapper = vtkImageMapper.newInstance();
      imageMapper.setSlicingMode(SlicingMode.K);
                          
      const imageActor = vtkImageSlice.newInstance();
      imageActor.getProperty().setInterpolationTypeToNearest();
      imageActor.setMapper(imageMapper);
      
      // Rendering and interaction
      const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkDiv.current,
        background: [0.9, 0.9, 0.9]
      });

      const renderWindow = fullScreenRenderWindow.getRenderWindow();
      const renderer = fullScreenRenderWindow.getRenderer();  
      renderer.getActiveCamera().setParallelProjection(true);

      const manipulator = Manipulators.vtkMouseRangeManipulator.newInstance({
        button: 1,
        scrollEnabled: true,
      });

      const interactorStyle = vtkInteractorStyleManipulator.newInstance();
      interactorStyle.addMouseManipulator(manipulator);

      fullScreenRenderWindow.getInteractor().setInteractorStyle(interactorStyle);

      // Widget
      const widgetManager = vtkWidgetManager.newInstance();
      widgetManager.setRenderer(renderer);

      const splineWidget = vtkSplineWidget.newInstance({
        resetAfterPointPlacement: true
      });

      const splineHandle = widgetManager.addWidget(splineWidget, ViewTypes.SLICE);      
      splineHandle.setOutputBorder(true);
      splineHandle.setVisibility(true);

      splineHandle.onEndInteractionEvent(() => {
        const points = splineHandle.getPoints();

        painter.paintPolygon(points);
      
        splineHandle.updateRepresentationForRender();
      });

      splineHandle.onStartInteractionEvent(() => {
        painter.startStroke();
      });

      widgetManager.grabFocus(splineWidget);

      renderer.resetCamera();

      setContext({
        fullScreenRenderWindow,
        renderWindow,
        renderer,
        interactorStyle,
        manipulator,
        imageMapper,
        imageActor,
        painter,
        outline,
        outlineMapper,
        outlineActor,
        splineHandle,
        splineWidget
      });
    }  
  }, [context, width, vtkDiv]);

  // Clean up
  useEffect(() => {
    return () => {
      if (context) {
        const { 
          imageMapper, imageActor, 
          outline, outlineMapper, outlineActor,
          fullScreenRenderWindow, manipulator, interactorStyle 
        } = context;

        imageMapper.delete();
        imageActor.delete();
        outline.delete();
        outlineMapper.delete();
        outlineActor.delete();
        manipulator.delete();
        interactorStyle.delete();        
        fullScreenRenderWindow.getInteractor().delete();
        fullScreenRenderWindow.delete();
      }
    };
  }, [context]);

  // Update image
  useEffect(() => {
    if (!context) return;

    const { renderWindow, renderer, manipulator, imageMapper, imageActor } = context;

    if (imageData) {
      const range = imageData.getPointData().getScalars().getRange();
      const extent = imageData.getExtent();          
      
      imageMapper.setInputData(imageData);
      //imageMapper.setSlice((extent[5] - extent[4]) / 2);
      imageMapper.setSlice(0);
                          
      imageActor.getProperty().setColorLevel((range[1] - range[0]) / 2);
      imageActor.getProperty().setColorWindow(range[1] - range[0]);
      
      const wMin = 1;
      const wMax = range[1] - range[0];
      const wGet = imageActor.getProperty().getColorWindow;
      const wSet = w => {
        imageActor.getProperty().setColorWindow(w);
      };
      const lMin = range[0];
      const lMax = range[1];
      const lGet = imageActor.getProperty().getColorLevel;
      const lSet = l => {
        imageActor.getProperty().setColorLevel(l);
      };
      const kMin = extent[4];
      const kMax = extent[5];
      const kGet = imageMapper.getSlice;
      const kSet = k => {
        imageMapper.setSlice(k);
      };

      manipulator.setVerticalListener(wMin, wMax, 1, wGet, wSet, 1);
      manipulator.setHorizontalListener(lMin, lMax, 1, lGet, lSet, 1);
      manipulator.setScrollListener(kMin, kMax, 1, kGet, kSet, 1);

      renderer.addActor(imageActor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();
    }
    else {
      renderer.removeActor(imageActor);
    }

  }, [context, imageData]);  

  // Update mask
  useEffect(() => {
    if (!context) return;

    const { renderer, renderWindow, painter, splineWidget, splineHandle, imageMapper, outlineMapper, outlineActor } = context;

    if (maskData) {
      painter.setBackgroundImage(maskData);  

      splineHandle.setHandleSizeInPixels(
        2 * Math.max(...maskData.getSpacing())
      );

      splineHandle.setFreehandMinDistance(
        4 * Math.max(...maskData.getSpacing())
      );

      imageMapper.onModified(() => {
        const slice = imageMapper.getSlice();

        outlineMapper.setSlice(imageMapper.getSlice());

        const ijk = [0, 0, slice];
        const position = [0, 0, 0];

        maskData.indexToWorld(ijk, position);

        splineWidget.getManipulator().setOrigin(position);

        splineHandle.updateRepresentationForRender();
      });

      renderer.addActor(outlineActor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();
    }
    else {
      renderer.removeActor(outlineActor);
    }

  }, [context, maskData]);  

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};