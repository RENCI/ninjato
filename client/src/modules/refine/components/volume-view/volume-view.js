import { RenderWindow, Surface, BoundingBox } from 'modules/view/components';
import { getUniqueLabels } from 'utils/data';
import { regionSurfaceColor } from 'utils/colors';
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
  regions.forEach((region, i) => {
    const labels = region.getLabels();
    region.setOpaqueColor(regionSurfaceColor(i, labels.length === 1 && labels[0] === label));
  });
};

export function VolumeView() {
  const renderWindow = RenderWindow();

  let regions = [];

  const getRegion = label => regions.find(region => {
    const labels = region.getLabels();

    return labels.length === 1 ? labels[0] === label : false;
  });

  const background = Surface();
  background.setTranslucentColors(...regionSurfaceColor());

  const boundingBox = BoundingBox();

  const render = renderWindow.render;

  let labels = [];
  let activeLabel = null;

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
    },
    setData: maskData => {
      if (maskData) {
        const allLabels = getUniqueLabels(maskData);

        background.setLabels(allLabels.filter(label => !labels.includes(label)));

        regions.forEach(region => region.setInputData(maskData));
        background.setInputData(maskData);
        boundingBox.setData(maskData);

        const renderer = renderWindow.getRenderer();
        regions.forEach(region => renderer.addActor(region.getActor()));
        renderer.addActor(background.getActor());
        renderer.addActor(boundingBox.getActor());
      } 
      else {
        const renderer = renderWindow.getRenderer();
        regions.forEach(region => renderer.removeActor(region.getActor()));
        renderer.removeActor(background.getActor());
        renderer.removeActor(boundingBox.getActor());
      }

      if (!activeLabel && labels.length > 0) {
        activeLabel = labels[0];

        applyActiveLabel(activeLabel, regions);

        resetCamera(renderWindow.getRenderer(), getRegion(activeLabel).getOutput());
      }
    },
    setLabels: regionLabels => {
      console.log(regionLabels);

      // Clean up any old regions
      regions.forEach(region => region.cleanUp());

      labels = regionLabels;

      // Create surfaces for each label
      regions = labels.map((label, i) => {
        const region = Surface();
        region.setOpaqueColor(regionSurfaceColor(i));
        region.setSliceHighlight(true);
        region.setLabels([label]);

        return region;
      });
    },
    setActiveLabel: label => {
      activeLabel = label;
      applyActiveLabel(label, regions, renderWindow);

      centerCamera(renderWindow, getRegion(label).getOutput(), background.getInputData());
    },
    //setHighlightLabel: label => mask.setHighlightLabel(label),
    setSlice: slice => {
      regions.forEach((region, i) => region.setSlice(slice, regionSurfaceColor(i, 'slice')));
    },
    setShowBackground: show => {
      background.getActor().setVisibility(show);
    },
    centerCamera: () => {
      centerCamera(renderWindow, getRegion(activeLabel).getOutput(), background.getInputData());
    },
    render: onRendered => {
      render();
      if (onRendered) onRendered();
    },
    cleanUp: () => {
      console.log('Clean up volume view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();      
      regions.forEach(region => region.cleanUp());
      background.cleanUp();
      boundingBox.cleanUp();
    }
  };
}