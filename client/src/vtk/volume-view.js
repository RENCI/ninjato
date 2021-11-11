import { useContext, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import { DataContext } from '../contexts';
import { useResize } from '../hooks';

export const VolumeView = () => {
  const [{ maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const context = useRef(null);
  const { width } = useResize(outerDiv);

  // Set up pipeline
  useEffect(() => {
    if (!context.current) {
      const marchingCubes = vtkImageMarchingCubes.newInstance({
        contourValue: 1,
        computeNormals: true,
        mergePoints: true
      });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(marchingCubes.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.getProperty().setColor(1, 0, 0);
      actor.setMapper(mapper);

      const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkDiv.current,
        background: [0.9, 0.9, 0.9]
      });

      const renderWindow = fullScreenRenderWindow.getRenderWindow();
      const renderer = fullScreenRenderWindow.getRenderer();  

      context.current = {
        marchingCubes,
        fullScreenRenderWindow,
        renderWindow,
        renderer,
        mapper,
        actor
      };
    }  

    return () => {
      if (context.current) {
        const { marchingCubes, mapper, actor, fullScreenRenderWindow } = context.current;

        marchingCubes.delete();
        actor.delete();
        mapper.delete();
        fullScreenRenderWindow.delete();

        context.current = null;
      }
    };
  }, [vtkDiv]);

  // Update data
  useEffect(() => {
    if (!context.current) return;

    const { marchingCubes, renderer, actor, renderWindow } = context.current;

    if (maskData) {
      marchingCubes.setInputData(maskData);

      renderer.addActor(actor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();
    } 
    else {
      renderer.removeActor()
    }
  }, [maskData]);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};