import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import vtkMouseRangeManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseRangeManipulator';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';

import { Widgets } from './widgets';
import { Image } from './image';
import { Mask } from './mask';

const slicingMode = vtkImageMapper.SlicingMode.K;

const resetCamera = (renderer, imageData) => {
  const [xMin, xMax, yMin, yMax] = imageData.getBounds();

  const x = (xMax - xMin) / 2;
  const y = (yMax - yMin) / 2;
  
  const position = [x, y, -1];
  const focalPoint = [x, y, 0];
  const viewUp = [0, -1, 0];
  const parallelScale = Math.max(x, y) + 0.5; // Add fudge factor to make sure full image visible

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

const findFirstSlice = (maskData, label) => {
  const [w, h, d] = maskData.getDimensions();
  const data = maskData.getPointData().getScalars().getData();

  for (let z = 0; z < d; z++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[z * w * h + x * h + y] === label) return z;
      }
    }
  }

  return 0;
};

const setWindowLevel = (actor, range) => {
  const colorLevel = (range[1] + range[0]) / 2;
  const colorWindow = range[1] - range[0];

  actor.getProperty().set({ colorLevel, colorWindow });
};

export function SliceView(onEdit, onSliceChange, onKeyDown, onKeyUp) {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let camera = null;
  let sliceRanges = null;

  const manipulator = vtkMouseRangeManipulator.newInstance({
    scrollEnabled: true,
  });

  const image = Image();
  const mask = Mask();  
  const widgets = Widgets(mask.getPainter(), onEdit);

  return {
    initialize: (rootNode, onKeyDown, onKeyUp) => {
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

      const interactor = renderWindow.getInteractor();

      interactor.setInteractorStyle(interactorStyle);

      interactor.onKeyDown(onKeyDown);
      interactor.onKeyUp(onKeyUp);

      widgets.setRenderer(renderer);

      //renderWindow.getInteractor().getView().setCursor('crosshair');
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);    
      mask.setInputData(maskData);

      sliceRanges = getSliceRanges(imageData);

      renderer.addViewProp(image.getActor());
      renderer.addViewProp(mask.getActor());
    
      resetCamera(renderer, imageData);

      const extent = imageData.getExtent(); 

      const kMin = extent[4];
      const kMax = extent[5];
      const kGet = image.getMapper().getSlice;
      const kSet = k => image.getMapper().setSlice(k);

      manipulator.setScrollListener(kMin, kMax, -1, kGet, kSet, 1);

      widgets.setImageData(maskData);
    
      const update = () => {  
        // Get slice position
        const ijk = [0, 0, 0];
        const position = [0, 0, 0];
  
        ijk[slicingMode] = image.getMapper().getSlice();
        imageData.indexToWorld(ijk, position);

        // Update window/level
        const z = Math.floor(ijk[slicingMode]);
        setWindowLevel(image.getActor(), sliceRanges[z]);
  
        // Update widget position
        widgets.update(position, imageData.getSpacing());
  
        // Update mask slice
        mask.setSlice(z);

        onSliceChange(z);
      };

      image.getMapper().onModified(update); 
      image.getMapper().setSlice(findFirstSlice(maskData, mask.getLabel()));
      update();
    },
    setLabel: label => mask.setLabel(label),
    setEditMode: editMode => widgets.setEditMode(editMode),
    setPaintBrush: brush => widgets.setPaintBrush(brush),
    setEraseBrush: brush => widgets.setEraseBrush(brush),
    setSlice: slice => image.getMapper().setSlice(slice),
    undo: () => {
      mask.getPainter().undo();
      onEdit()
    },
    redo: () => {
      mask.getPainter().redo();
      onEdit();
    },
    canUndo: () => mask.getPainter().canUndo(),
    canRedo: () => mask.getPainter().canRedo(),
    cleanUp: () => {
      console.log("Clean up");
    }
  };
}