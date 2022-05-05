import { RenderWindow, Surface, BoundingBox } from 'modules/view/components';
import { getUniqueLabels } from 'utils/data';
import { 
  regionSurfaceColor, 
  backgroundSurfaceColor1, 
  backgroundSurfaceColor2, 
  regionSliceHighlightColors
} from 'utils/colors';
import { interpolate, distance } from 'utils/math';

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

const centerCamera = (renderWindow, surface, volume) => {
  if (surface.getPoints().getNumberOfPoints() > 0) {
    const renderer = renderWindow.getRenderer();
    const camera = renderer.getActiveCamera();
    const start = camera.getFocalPoint();

    const [x1, x2, y1, y2, z1, z2] = surface.getPoints().getBounds();
    const end = [
      (x2 + x1) / 2,
      (y2 + y1) / 2,
      (z2 + z1) / 2
    ];

    const endPos = camera.getPosition();
    endPos[0] += end[0] - start[0];
    endPos[1] += end[1] - start[1];
    endPos[2] += end[2] - start[2]; 

    const [bx1, bx2, by1, by2, bz1, bz2] = volume.getBounds();
    const diagonal = distance([bx1, by1, bz1], [bx2, by2, bz2]);

    const d = distance(start, end);

    const maxDuration = 2000;
    const duration = interpolate(0, maxDuration, d / diagonal);
    
    const startTime = new Date();

    function animate() {
      const now = new Date();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      const [tx, ty, tz] = interpolate(start, end, t);
      const [fx, fy, fz] = camera.getFocalPoint();
      const [dx, dy, dz] = [tx - fx, ty - fy, tz - fz];

      camera.translate(dx, dy, dz);

      // XXX: Next two calls are causing flying edges to be recalculated
      renderer.resetCameraClippingRange();
      renderWindow.render();

      if (elapsed < duration) {
        // Keep going
        setTimeout(animate, 0);
      }
      else {
        // Make sure we are at the right spot
        camera.setFocalPoint(...end);
        camera.setPosition(...endPos);  

        renderer.resetCameraClippingRange();
        renderWindow.render();      
      }
    };

    animate();    
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
      // Clean up any old regions
      Object.values(regions).forEach(region => region.cleanUp());

      labels = regionLabels;

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
      centerCamera(renderWindow, regions[label].getOutput(), background.getInputData());
      regions[label].getOutput();
    },
    //setHighlightLabel: label => mask.setHighlightLabel(label),
    setSlice: slice => {
      Object.values(regions).forEach((region, i) => region.setSlice(slice, regionSliceHighlightColors(i)));
    },
    setShowBackground: show => {
      background.getActor().setVisibility(show);
    },
    centerCamera: () => {
      centerCamera(renderWindow, regions[activeLabel].getOutput(), background.getInputData());
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