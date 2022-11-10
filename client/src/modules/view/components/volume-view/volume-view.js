import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';

import vtkInteractorStyleNinjato3D from 'vtk/interaction/interactor-style-ninjato-3d';
import { RenderWindow, BoundingBox } from 'modules/view/components';
import { RegionSurface, BackgroundSurface } from 'modules/view/components/surface';
import { Widgets } from 'modules/view/components/volume-view/widgets';
import { backgroundColors } from 'utils/colors';
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

const getSurface = (surfaces, region) => !region ? null : 
  surfaces.find(surface => surface.getRegion().label === region.label);

const getRegion = (regions, surface) => regions.find(({ label }) => surface.getRegion().label === label);

export function VolumeView(painter) {  
  // Callbacks
  //let onSliceChange = () => {};

  const renderWindow = RenderWindow();
  const widgets = Widgets(painter);

  let surfaces = [];

  const background = BackgroundSurface();
  background.setColors(backgroundColors.surface1, backgroundColors.surface2);

  let backgroundSurfaces = [];

  const boundingBox = BoundingBox();

  const render = renderWindow.render;

  let regions = [];
  let activeRegion = null;

  let slice = -1;

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      

      const interactor = renderWindow.getInteractor();
      interactor.setInteractorStyle(vtkInteractorStyleNinjato3D.newInstance());
      interactor.setPicker(vtkCellPicker.newInstance());

      widgets.setRenderer(renderWindow.getRenderer());
    },
    setImageMapper: mapper => renderWindow.getInteractor().getInteractorStyle().setImageMapper(mapper),
    setCallback: (type, callback) => {
      switch (type) { 
/*        
        case 'sliceChange':
          onSliceChange = callback;
          break;

        case 'keyDown':
          slice.setCallback(type, key => key === 'i' ? image.toggleInterpolation() : callback(key));
          break;

        case 'keyUp':
          slice.setCallback(type, callback);
          break;
*/          

        default: 
          widgets.setCallback(type, callback);
      }
    },
    setData: maskData => {
      const combined = [...surfaces, ...backgroundSurfaces];

      if (maskData) {
        combined.forEach(surface => surface.setInputData(maskData));
        background.setInputData(maskData);
        boundingBox.setData(maskData);

        const renderer = renderWindow.getRenderer();
        combined.forEach(surface => {
          renderer.addActor(surface.getActor());
          renderer.addActor(surface.getHighlight().getActor());
        });
        renderer.addActor(background.getActor());
        renderer.addActor(boundingBox.getActor());

        widgets.setImageData(maskData);
      } 
      else {
        const renderer = renderWindow.getRenderer();
        combined.forEach(surface => renderer.removeActor(surface.getActor()));
        renderer.removeActor(background.getActor());
        renderer.removeActor(boundingBox.getActor());
      }

      if (!activeRegion && regions.length > 0) {
        activeRegion = regions[0];

//        applyActiveRegion(activeRegion, surfaces);

        resetCamera(renderWindow.getRenderer(), getSurface(surfaces, activeRegion).getOutput());
      }
    },
    setRegions: (regionArray, backgroundRegions) => {
      background.setRegions(backgroundRegions);
      widgets.setRegions(regionArray, backgroundRegions);

      // Clean up any old surfaces
      [...surfaces, ...backgroundSurfaces].forEach(surface => {
        renderWindow.getRenderer().removeActor(surface.getActor());
        surface.cleanUp();
      });

      regions = regionArray;

      // Create surfaces for each region
      surfaces = regions.map(region => {
        const surface = RegionSurface();
        surface.setColor(region.colors.surface);
        surface.setRegion(region);

        return surface;
      });

      // Create surfaces for each background region
      backgroundSurfaces = backgroundRegions.map(region => {
        const surface = RegionSurface();
        surface.setColor(backgroundColors.surface2);
        surface.setRegion(region);
        surface.setVisibility(false);

        return surface;
      });

      const data = background.getInputData();

      if (data) {
        const renderer = renderWindow.getRenderer();

        surfaces.forEach(surface => {
          surface.setInputData(data);     
          renderer.addActor(surface.getActor());

          if (slice >= 0) {
            const region = getRegion(regions, surface);

            if (region) surface.setSlice(slice, region.colors.surfaceSlice);
          }
        });

        backgroundSurfaces.forEach(surface => {
          surface.setInputData(data);     
          renderer.addActor(surface.getActor());
        });
      }
    },
    setActiveRegion: region => {
      activeRegion = region;

      const surface = getSurface(surfaces, region);
      
      if (!surface) return;

//      applyActiveRegion(, regions, renderWindow);

      widgets.setActiveRegion(region);

      centerCamera(renderWindow, surface.getOutput(), background.getInputData());
    },
    setHighlightRegion: highlightRegion => {
      background.setHighlightRegion(highlightRegion);

      [...surfaces, ...backgroundSurfaces].forEach(surface => {
        const region = surface.getRegion();
        const highlight = region === highlightRegion;
        surface.getActor().setVisibility(region.visible || highlight);
        surface.getHighlight().setVisibility(highlight);
      });
    },
    setWidgetPosition: position => widgets.setPosition(position),
    setTool: (tool, cursor) => {      
      widgets.setTool(tool);
      renderWindow.setCursor(cursor);
      renderWindow.render();
    },
    setSlice: sliceNumber => {
      slice = sliceNumber;
      surfaces.forEach(surface => {
        const region = getRegion(regions, surface);
        if (region) surface.setSlice(slice, region.colors.surfaceSlice);
      });

      backgroundSurfaces.forEach(surface => {
        surface.setSlice(-1, [[0, 0, 0], [0, 0, 0]]);
      });
    },
    setShowBackground: show => {
      background.getActor().setVisibility(show);
    },
    updateVisibility: region => {
      const foreground = regions.includes(region);

      if (foreground) {
        getSurface(surfaces, region).setVisibility(region.visible);
      }
      else {
        getSurface(backgroundSurfaces, region).setVisibility(region.visible);
        background.updateVisibility();
      }

      render();
    },
    centerCamera: () => {
      const surface = getSurface(surfaces, activeRegion);

      if (!surface) return;

      centerCamera(renderWindow, surface.getOutput(), background.getInputData());
    },
    render: onRendered => {
      render();
      if (onRendered) onRendered();
    },
    mouseOut: () => widgets.mouseOut(),
    cleanUp: () => {
      console.log('Clean up volume view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();      
      [...surfaces, ...backgroundSurfaces].forEach(surface => surface.cleanUp());
      background.cleanUp();
      boundingBox.cleanUp();
    }
  };
}