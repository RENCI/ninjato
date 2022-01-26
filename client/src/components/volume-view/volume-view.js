import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import { Surface } from './surface';

const resetCamera = renderer => {
  const position = [0, 0, -1];
  const focalPoint = [0, 0, 0];
  const viewUp = [0, -1, 0];

  renderer.getActiveCamera().set({ position, focalPoint, viewUp });
  renderer.resetCamera();
};

export function VolumeView() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let surface = Surface();

  function render() {
    renderWindow.render();
  };

  return {
    initialize: rootNode => {
      if (fullScreenRenderWindow) return;

      fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: rootNode,
        background: [0, 0, 0, 0]
      });
  
      renderWindow = fullScreenRenderWindow.getRenderWindow();
      renderer = fullScreenRenderWindow.getRenderer();
    },
    setData: maskData => {
      if (maskData) {
        surface.setInputData(maskData);

        renderer.addActor(surface.getActor());

        resetCamera(renderer);
        renderer.resetCameraClippingRange();
        render();
      } 
      else {
        renderer.removeActor(surface.getActor());
      }
    },
    render: () => {
      render();
    },
    cleanUp: () => {
      surface.cleanUp();
      fullScreenRenderWindow.delete();
    }
  };
}