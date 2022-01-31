import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import { Widgets } from './widgets';
import { Image } from './image';
import { Mask } from './mask';

import Manipulators from '@kitware/vtk.js/Interaction/Manipulators';

const slicingMode = vtkImageMapper.SlicingMode.K;

const resetCamera = (renderer, imageData) => {
  const [xMin, xMax, yMin, yMax] = imageData.getBounds();

  const x = (xMax - xMin) / 2;
  const y = (yMax - yMin) / 2;
  
  const position = [x, y, -1];
  const focalPoint = [x, y, 0];
  const viewUp = [0, -1, 0];
  const parallelScale = Math.max(x, y);

  renderer.getActiveCamera().set({ position, focalPoint, viewUp, parallelScale });
};

const getSliceRanges = imageData => {
  const [w, h, d] = imageData.getDimensions();
  const data = imageData.getPointData().getScalars().getData();

  const ranges = [];
  for (let z = 0; z < d; z++) {
    let max = -Infinity;
    let min = Infinity;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const value = data[z * w * h + x * h + y];

        if (value > max) max = value;
        if (value < min) min = value;
      }
    }

    ranges.push([min, max]);
  }

  return ranges;
};

const setWindowLevel = (actor, range) => {
  const colorLevel = (range[1] + range[0]) / 2;
  const colorWindow = range[1] - range[0];

  actor.getProperty().set({ colorLevel, colorWindow });
};

export function SliceView(onEdit) {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let camera = null;
  let ranges = null;

  const manipulator = Manipulators.vtkMouseRangeManipulator.newInstance({
    button: 1,
    scrollEnabled: true,
  });

  const image = Image();
  const mask = Mask();  
  const widgets = Widgets(mask.getPainter(), onEdit);

  return {
    initialize: rootNode => {
      if (fullScreenRenderWindow) return;

      fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: rootNode,
        background: [0, 0, 0, 0]
      });

      renderWindow = fullScreenRenderWindow.getRenderWindow();
      renderer = fullScreenRenderWindow.getRenderer();
      
      camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);

      const interactorStyle = vtkInteractorStyleManipulator.newInstance();
      interactorStyle.addMouseManipulator(manipulator);

      renderWindow.getInteractor().setInteractorStyle(interactorStyle);

      widgets.setRenderer(renderer);

//      renderWindow.getInteractor().getView().setCursor('crosshair');
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);    
      mask.setInputData(imageData, maskData);

      ranges = getSliceRanges(imageData);

      renderer.addViewProp(image.getActor());
      renderer.addViewProp(mask.getActor());
    
      resetCamera(renderer, imageData);

      const range = imageData.getPointData().getScalars().getRange();
      const extent = imageData.getExtent(); 

      const wMin = 1;
      const wMax = range[1] - range[0];
      const wGet = image.getActor().getProperty().getColorWindow;
      const wSet = w => image.getActor().getProperty().setColorWindow(w);

      const lMin = range[0];
      const lMax = range[1];
      const lGet = image.getActor().getProperty().getColorLevel;
      const lSet = l => image.getActor().getProperty().setColorLevel(l);

      const kMin = extent[4];
      const kMax = extent[5];
      const kGet = image.getMapper().getSlice;
      const kSet = k => image.getMapper().setSlice(k);

      manipulator.setVerticalListener(wMin, wMax, 1, wGet, wSet, 1);
      manipulator.setHorizontalListener(lMin, lMax, 1, lGet, lSet, 1);
      manipulator.setScrollListener(kMin, kMax, -1, kGet, kSet, 1);
    
      const update = () => {  
        // Get slice position
        const ijk = [0, 0, 0];
        const position = [0, 0, 0];
  
        ijk[slicingMode] = image.getMapper().getSlice();
        imageData.indexToWorld(ijk, position);

        // Update window/level
        const z = Math.floor(ijk[slicingMode]);
        setWindowLevel(image.getActor(), ranges[z]);
  
        // Update widget position
        widgets.update(position, imageData.getSpacing());
  
        // Update mask slice
        mask.getMapper().set(image.getMapper().get('slice', 'slicingMode'));
      };

      image.getMapper().onModified(update);
      update();   
    },
    setEditMode: editMode => {
      mask.setEditMode(editMode);
    },
    cleanUp: () => {
      console.log("Clean up");
    }
  };
}