import { useState, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

export const VolumeView = () => {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    if (!context.current) {
      const reader = vtkXMLImageDataReader.newInstance({
        fetchGzip: true,
      });

      reader
        .setUrl(`test-data.vti`)
        .then(() => {      
          const data = reader.getOutputData();
          const range = data.getPointData().getScalars().getRange();

          const marchingCubes = vtkImageMarchingCubes.newInstance({
            contourValue: (range[1] - range[0]) / 2,
            computeNormals: true,
            mergePoints: true,
          });
          marchingCubes.setInputConnection(reader.getOutputPort());

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
            reader,
            marchingCubes,
            fullScreenRenderWindow,
            renderWindow,
            renderer,
            mapper,
            actor
          };
        });
    }  

    return () => {
      if (context.current) {
        const { reader, fullScreenRenderWindow, mapper, actor } = context.current;

        actor.delete();
        mapper.delete();
        fullScreenRenderWindow.delete();
        reader.delete();

        context.current = null;
      }
    };
  }, [vtkContainerRef]);

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