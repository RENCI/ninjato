import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import { Surface } from './surface';
import { BoundingBox } from './bounding-box';
import { Reds, Blues } from 'utils/colors';

const resetCamera = renderer => {
  const position = [0, 0, -1];
  const focalPoint = [0, 0, 0];
  const viewUp = [0, -1, 0];

  renderer.getActiveCamera().set({ position, focalPoint, viewUp });
  renderer.resetCamera();

  renderer.getActiveCamera().azimuth(-15);
  renderer.getActiveCamera().elevation(20);
};

const regionFormula = label => (v => v === label ? 1 : 0);
const backgroundFormula = label => (v => v !== label && v !== 0 ? 1 : 0);

export function VolumeView() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let aspectRatio = 1.5;  // XXX: Should be stored with volume somehow

  const regionColor = Reds[5];
  const region = Surface();
  region.getActor().getProperty().setDiffuseColor(regionColor);
  region.getActor().getProperty().setAmbientColor(regionColor);
  region.getActor().getProperty().setAmbient(0.2);
  region.getActor().setScale([1, 1, aspectRatio]);

  const backgroundColor = Blues[2];
  const background = Surface();
  background.getActor().getProperty().setDiffuseColor(backgroundColor);
  background.getActor().getProperty().setAmbientColor(backgroundColor);
  background.getActor().getProperty().setAmbient(0.5);
  background.getActor().getProperty().setOpacity(0.2);
  background.getActor().setScale([1, 1, aspectRatio]);

  const boundingBox = BoundingBox();

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
        boundingBox.setData(maskData, aspectRatio);

        renderer.addActor(region.getActor());
        renderer.addActor(background.getActor());
        renderer.addActor(boundingBox.getActor());

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
      boundingBox.cleanUp();
      fullScreenRenderWindow.delete();
    }
  };
}