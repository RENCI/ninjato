import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import { Surface } from './surface';
import { Reds, Blues } from 'utils/colors';

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
  let aspectRatio = 1.5;  // XXX: Should be stored with volume somehow

  let region = Surface();
  region.getActor().getProperty().setColor(Reds[5]);
  region.getActor().setScale([1, 1, aspectRatio]);

  let background = Surface();
  background.getActor().getProperty().setColor(Blues[2]);
  background.getActor().getProperty().setOpacity(0.2);
  background.getActor().setScale([1, 1, aspectRatio]);

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