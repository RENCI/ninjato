import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import { Surface } from './surface';

let fullScreenRenderWindow = null;
let renderWindow = null;
let renderer = null;
let surface = Surface();

const initializeRenderer = rootNode => {
  fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
    rootContainer: rootNode,
    background: [0.9, 0.9, 0.9]
  });

  renderWindow = fullScreenRenderWindow.getRenderWindow();
  renderer = fullScreenRenderWindow.getRenderer();
}; 

export const volumeView = {
  initialize: rootNode => {
    if (fullScreenRenderWindow) return;

    initializeRenderer(rootNode);
  },
  setData: maskData => {
    if (maskData) {
      surface.setInputData(maskData);

      renderer.addActor(surface.actor);

      renderer.resetCamera();
      renderer.resetCameraClippingRange();
      renderWindow.render();
    } 
    else {
      renderer.removeActor(surface.actor);
    }
  },
  cleanUp: () => {
    surface.cleanUp();
    fullScreenRenderWindow.delete();
  }
};