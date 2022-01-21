import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

let initialized = false;
const scene = {};
const surface = {};

const initializeScene = rootNode => {
  scene.fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
    rootContainer: rootNode,
    background: [0.9, 0.9, 0.9]
  });

  scene.renderWindow = scene.fullScreenRenderWindow.getRenderWindow();
  scene.renderer = scene.fullScreenRenderWindow.getRenderer();
};

const initializeSurface = () => {
  surface.marchingCubes = vtkImageMarchingCubes.newInstance({
    contourValue: 1,
    computeNormals: true,
    mergePoints: true
  });

  surface.mapper = vtkMapper.newInstance();
  surface.mapper.setInputConnection(surface.marchingCubes.getOutputPort());

  surface.actor = vtkActor.newInstance();
  surface.actor.getProperty().setColor(1, 0, 0);
  surface.actor.setMapper(surface.mapper); 
};

export const volumeView = {
  initialize: rootNode => {
    if (initialized) return;

    initializeScene(rootNode);
    initializeSurface();

    initialized = true;
  },
  setData: (imageData, maskData) => {
    if (maskData) {
      surface.marchingCubes.setInputData(maskData);

      scene.renderer.addActor(surface.actor);

      scene.renderer.resetCamera();
      scene.renderer.resetCameraClippingRange();
      scene.renderWindow.render();
    } 
    else {
      scene.renderer.removeActor()
    }
  },
  cleanUp: () => {
    surface.marchingCubes.delete();
    surface.actor.delete();
    surface.mapper.delete();
    scene.fullScreenRenderWindow.getInteractor().delete();
    scene.fullScreenRenderWindow.delete();
  }
};