import { RenderWindow, Surface, BoundingBox } from 'modules/view/components';
import { getUniqueLabels } from 'utils/data';

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

  renderer.resetCameraClippingRange();
};

const centerCamera = (renderer, surface) => {
  if (surface.getPoints().getNumberOfPoints() > 0) {
    const [x1, x2, y1, y2, z1, z2] = surface.getPoints().getBounds();

    const x = (x2 + x1) / 2;
    const y = (y2 + y1) / 2;
    const z = (z2 + z1) / 2;

    renderer.getActiveCamera().setFocalPoint(x, y, z);
    renderer.resetCameraClippingRange();
  }
};

export function VolumeView() {
  const renderWindow = RenderWindow();

  const region = Surface('region');  
  const background = Surface();

  const boundingBox = BoundingBox();

  const render = renderWindow.render;

  let labels = [];

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
    },
    setData: maskData => {
      if (maskData) {
        labels = getUniqueLabels(maskData);

        region.setInputData(maskData);
        background.setInputData(maskData);
        boundingBox.setData(maskData);

        const renderer = renderWindow.getRenderer();
        renderer.addActor(region.getActor());
        renderer.addActor(background.getActor());
        renderer.addActor(boundingBox.getActor());
      } 
      else {
        const renderer = renderWindow.getRenderer();
        renderer.removeActor(region.getActor());
        renderer.removeActor(background.getActor());
      }
    },
    setLabel: label => {
      region.setLabels([label]);
      background.setLabels(labels.filter(value => value !== label));

      resetCamera(renderWindow.getRenderer(), region.getOutput());
    },
    setSlice: slice => {
      region.setSlice(slice);
    },
    setLinks: linkLabels => linkLabels,//background.setActiveLabels(linkLabels),
    setHighlightLabel: label => label,//background.setHighlightLabel(label),    
    setShowBackground: show => {
      background.getActor().setVisibility(show);
    },
    centerCamera: () => {
      centerCamera(renderWindow.getRenderer(), region.getOutput());
    },
    render: onRendered => {
      render();
      if (onRendered) onRendered();
    },
    cleanUp: () => {
      console.log('Clean up volume view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();      
      region.cleanUp();
      background.cleanUp();
      boundingBox.cleanUp();
    }
  };
}