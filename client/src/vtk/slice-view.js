import { useContext, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Volume';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';

import Manipulators from '@kitware/vtk.js/Interaction/Manipulators';

import { DataContext } from '../contexts';

const { SlicingMode } = vtkImageMapper;

export const SliceView = () => {
  const [{ imageData }] = useContext(DataContext);
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    if (!context.current && imageData) {
      const range = imageData.getPointData().getScalars().getRange();
      const extent = imageData.getExtent();          
      
      const imageMapper = vtkImageMapper.newInstance();
      imageMapper.setInputData(imageData);
      imageMapper.setSlicingMode(SlicingMode.K);
      imageMapper.setSlice((extent[5] - extent[4]) / 2);
                          
      const imageActor = vtkImageSlice.newInstance();
      imageActor.getProperty().setInterpolationTypeToNearest();
      imageActor.getProperty().setColorLevel((range[1] - range[0]) / 2);
      imageActor.getProperty().setColorWindow(range[1] - range[0]);
      imageActor.setMapper(imageMapper);
      
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

      const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        background: [0.9, 0.9, 0.9]
      });

      const renderWindow = fullScreenRenderWindow.getRenderWindow();
      const renderer = fullScreenRenderWindow.getRenderer();  
      renderer.getActiveCamera().setParallelProjection(true);

      const manipulator = Manipulators.vtkMouseRangeManipulator.newInstance({
        button: 1,
        scrollEnabled: true,
      });
      manipulator.setVerticalListener(wMin, wMax, 1, wGet, wSet, 1);
      manipulator.setHorizontalListener(lMin, lMax, 1, lGet, lSet, 1);
      manipulator.setScrollListener(kMin, kMax, 1, kGet, kSet, 1);

      const interactorStyle = vtkInteractorStyleManipulator.newInstance();
      interactorStyle.addMouseManipulator(manipulator);

      fullScreenRenderWindow.getInteractor().setInteractorStyle(interactorStyle);

      renderer.addActor(imageActor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();

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
        const { reader, fullScreenRenderWindow, interactorStyle, manipulator, imageMapper, imageActor } = context.current;

        imageActor.delete();
        imageMapper.delete();
        manipulator.delete();
        interactorStyle.delete();
        fullScreenRenderWindow.delete();

        context.current = null;
      }
    };
  }, [vtkContainerRef, imageData]);

/*  
    useEffect(() => {
        if (context.current) {
            const { coneSource, renderWindow } = context.current;
            coneSource.setResolution(coneResolution);
            renderWindow.render();
        }
    }, [coneResolution]);

    useEffect(() => {
        if (context.current) {
            const { actor, renderWindow } = context.current;
            actor.getProperty().setRepresentation(representation);
            renderWindow.render();
        }
    }, [representation]);
*/    

  return (
    <div style={{ height: 500 }}>
      <div ref={ vtkContainerRef } />
    </div>
  );
};