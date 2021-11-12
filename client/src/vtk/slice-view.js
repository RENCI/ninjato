import { useContext, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkImageOutlineFilter from '@kitware/vtk.js/Filters/General/ImageOutlineFilter';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';

import Manipulators from '@kitware/vtk.js/Interaction/Manipulators';

import { DataContext } from '../contexts';
import { useResize } from '../hooks';

const { SlicingMode } = vtkImageMapper;

export const SliceView = () => {
  const [{ imageData, maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const context = useRef(null);
  const { width } = useResize(outerDiv);
     
  // Set up pipeline
  useEffect(() => {   
    if (!context.current && width) {   
      const outline = vtkImageOutlineFilter.newInstance();
      outline.setSlicingMode(SlicingMode.K);

      const outlineMapper = vtkImageMapper.newInstance();
      outlineMapper.setSlicingMode(SlicingMode.K);
      outlineMapper.setInputConnection(outline.getOutputPort());

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

      const imageMapper = vtkImageMapper.newInstance();
      imageMapper.setSlicingMode(SlicingMode.K);
      imageMapper.onModified(() => {
        outlineMapper.setSlice(imageMapper.getSlice());
      });
                          
      const imageActor = vtkImageSlice.newInstance();
      imageActor.getProperty().setInterpolationTypeToNearest();
      imageActor.setMapper(imageMapper);
      
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

      context.current = {
        fullScreenRenderWindow,
        renderWindow,
        renderer,
        interactorStyle,
        manipulator,
        imageMapper,
        imageActor,
        outline,
        outlineMapper,
        outlineActor
      };
    }  
  }, [vtkDiv, width]);

  // Clean up
  useEffect(() => {
    return () => {
      if (context.current) {
        const { 
          imageMapper, imageActor, 
          outline, outlineMapper, outlineActor,
          fullScreenRenderWindow, manipulator, interactorStyle 
        } = context.current;

        imageMapper.delete();
        imageActor.delete();
        outline.delete();
        outlineMapper.delete();
        outlineActor.delete();
        fullScreenRenderWindow.delete();
        manipulator.delete();
        interactorStyle.delete();

        context.current = null;
      }
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!context.current) return;

    const { renderWindow, renderer, manipulator, imageMapper, imageActor } = context.current;

    if (imageData) {
      const range = imageData.getPointData().getScalars().getRange();
      const extent = imageData.getExtent();          
      
      imageMapper.setInputData(imageData);
      imageMapper.setSlice((extent[5] - extent[4]) / 2);
                          
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

  }, [imageData]);  

  // Update mask
  useEffect(() => {
    if (!context.current) return;

    const { renderer, renderWindow, outline, outlineActor } = context.current;

    if (maskData) {
      const range = imageData.getPointData().getScalars().getRange();
      const extent = imageData.getExtent();          
      
      outline.setInputData(maskData);

      renderer.addActor(outlineActor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();
    }
    else {
      renderer.removeActor(outlineActor);
    }

  }, [maskData]);  

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};