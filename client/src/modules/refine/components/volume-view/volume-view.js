import { RenderWindow, Surface, BoundingBox } from 'modules/view/components';
import { getUniqueLabels } from 'utils/data';
import { 
  regionSurfaceColor, 
  backgroundSurfaceColor1, 
  backgroundSurfaceColor2, 
  regionSliceHighlightColors
} from 'utils/colors';

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

const applyActiveLabel = (label, regions) => {
  Object.entries(regions).forEach(([key, region], i) => region.setOpaqueColor(regionSurfaceColor(i, key === label)));
};

export function VolumeView() {
  const renderWindow = RenderWindow();

  let regions = {};

  const background = Surface();
  background.setTranslucentColors(backgroundSurfaceColor1, backgroundSurfaceColor2);

  const boundingBox = BoundingBox();

  const render = renderWindow.render;

  let labels = [];
  let activeLabel = null;

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
    },
    setData: (maskData, onRendered) => {
      if (maskData) {
        const allLabels = getUniqueLabels(maskData);

        console.log(regions);

        background.setLabels(allLabels.filter(label => !labels.includes(label)));

        Object.values(regions).forEach(region => region.setInputData(maskData));
        background.setInputData(maskData);
        boundingBox.setData(maskData);

        const renderer = renderWindow.getRenderer();
        Object.values(regions).forEach(region => renderer.addActor(region.getActor()));
        renderer.addActor(background.getActor());
        renderer.addActor(boundingBox.getActor());
      } 
      else {
        const renderer = renderWindow.getRenderer();
        Object.values(regions).forEach(region => renderer.removeActor(region.getActor()));
        renderer.removeActor(background.getActor());
        renderer.removeActor(boundingBox.getActor());
      }

      if (!activeLabel && labels.length > 0) {
        activeLabel = labels[0];

        applyActiveLabel(activeLabel, regions);

        resetCamera(renderWindow.getRenderer(), regions[activeLabel].getOutput());
      }
    },
    setLabels: regionLabels => {
      labels = regionLabels;


      // XXX: Old surfaces are not being removed from renderer. Probably the reason for 
      // doubled surfaces. Probably make sense to combine setLabels and setData, and do some 
      // clean up before creating and adding things.
      // Similar could be happening in slice view with points not being in extent: still have old one 
      // hanging around.


      // Create surfaces for each label
      regions = labels.reduce((regions, label, i) => {
        const region = Surface();
        region.setOpaqueColor(regionSurfaceColor(i));
        region.setSliceHighlight(true);
        region.setLabels([label]);

        regions[label] = region;

        return regions;
      }, {});
    },
    setActiveLabel: label => {
      activeLabel = label;
      applyActiveLabel(label, regions, renderWindow);
      centerCamera(renderWindow.getRenderer(), regions[label].getOutput());
    },
    //setHighlightLabel: label => mask.setHighlightLabel(label),
    setSlice: slice => {
      Object.values(regions).forEach((region, i) => region.setSlice(slice, regionSliceHighlightColors(i)));
    },
    setShowBackground: show => {
      background.getActor().setVisibility(show);
    },
    centerCamera: () => {
      centerCamera(renderWindow.getRenderer(), regions[activeLabel].getOutput());
    },
    render: onRendered => {
      render();
      if (onRendered) onRendered();
    },
    cleanUp: () => {
      console.log('Clean up volume view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();      
      Object.values(regions).forEach(region => region.cleanUp());
      background.cleanUp();
      boundingBox.cleanUp();
    }
  };
}