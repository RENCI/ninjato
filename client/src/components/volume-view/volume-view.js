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

const regionFormula = label => (v => v === label ? 1 : 0);
const backgroundFormula = label => (v => v !== label && v !== 0 ? 1 : 0);

export function VolumeView() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let label = -1;
  let region = Surface(regionFormula(label), [1, 0, 0]);
  let background = Surface(backgroundFormula(label), [0.8, 0.9, 1]);

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
    setData: (maskData, onRendered) => {
      if (maskData) {
        region.setInputData(maskData);
        background.setInputData(maskData);

        renderer.addActor(region.getActor());
        renderer.addActor(background.getActor());

        resetCamera(renderer);
        renderer.resetCameraClippingRange();
        render();

        onRendered();
      } 
      else {
        renderer.removeActor(region.getActor());
        renderer.removeActor(background.getActor());
      }
    },
    setLabel: label => {
      region.setFormula(regionFormula(label));
      background.setFormula(backgroundFormula(label));
    },
    render: () => {
      render();
    },
    cleanUp: () => {
      region.cleanUp();
      background.cleanUp();
      fullScreenRenderWindow.delete();
    }
  };
}