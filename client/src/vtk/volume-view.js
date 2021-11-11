import { useContext, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import { DataContext } from '../contexts';

export const VolumeView = () => {
  const [{ imageData }] = useContext(DataContext);
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    if (!context.current && imageData) {
      const range = imageData.getPointData().getScalars().getRange();

      const marchingCubes = vtkImageMarchingCubes.newInstance({
        contourValue: (range[1] - range[0]) / 2,
        computeNormals: true,
        mergePoints: true,
      });
      marchingCubes.setInputData(imageData);

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(marchingCubes.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: vtkContainerRef.current,
        background: [0.9, 0.9, 0.9]
      });

      const renderWindow = fullScreenRenderWindow.getRenderWindow();
      const renderer = fullScreenRenderWindow.getRenderer();  

      renderer.addActor(actor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();

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
        const { reader, fullScreenRenderWindow, mapper, actor } = context.current;

        actor.delete();
        mapper.delete();
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