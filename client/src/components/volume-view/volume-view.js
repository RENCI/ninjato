import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import { Surface } from './surface';
import { BoundingBox } from './bounding-box';

const resetCamera = (renderer, surface) => {
  const [x1, x2, y1, y2, z1, z2] = surface.getPoints().getBounds();
  const x = (x2 + x1) / 2;
  const y = (y2 + y1) / 2;
  const z = (z2 + z1) / 2;

  const position = [0, 0, -1];
  const focalPoint = [0, 0, 0];
  const viewUp = [0, -1, 0];

  const cam = renderer.getActiveCamera();

  cam.set({ position, focalPoint, viewUp });
  renderer.resetCamera();

  const p = cam.getPosition();
  cam.translate(x - p[0], y - p[1], 0);
  cam.setDistance(Math.abs(p[2] - z));

  cam.azimuth(-15);
  cam.elevation(20);
};

export function VolumeView() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;

  const region = Surface('region');  
  const background = Surface();

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
        boundingBox.setData(maskData);

        renderer.addActor(region.getActor());
        renderer.addActor(background.getActor());
        renderer.addActor(boundingBox.getActor());

        resetCamera(renderer, region.getOutput());
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
      region.setLabel(label);
      background.setLabel(label);
    },
    setSlice: slice => {
      region.setSlice(slice);
      render();
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