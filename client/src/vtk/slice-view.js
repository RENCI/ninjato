import { useContext, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';

import Manipulators from '@kitware/vtk.js/Interaction/Manipulators';

import { DataContext } from '../contexts';
import { useResize } from '../hooks';

const { SlicingMode } = vtkImageMapper;

export const SliceView = () => {
  const [{ imageData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const context = useRef(null);
  const { width } = useResize(outerDiv);
     
  // Set up pipeline
  useEffect(() => {   
    if (!context.current) {   
      const imageMapper = vtkImageMapper.newInstance();
      imageMapper.setSlicingMode(SlicingMode.K);
                          
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
        imageActor
      };
    }  

    return () => {
      if (context.current) {
        const { imageMapper, imageActor, fullScreenRenderWindow, manipulator, interactorStyle } = context.current;

        imageMapper.delete();
        imageActor.delete();
        fullScreenRenderWindow.delete();
        manipulator.delete();
        interactorStyle.delete();

        context.current = null;
      }
    };
  }, [vtkDiv, imageData]);

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

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};