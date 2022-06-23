import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import vtkMouseRangeManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseRangeManipulator';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';

const slicingMode = vtkImageMapper.SlicingMode.K;

const resetCamera = (camera, imageData) => {
  const [xMin, xMax, yMin, yMax] = imageData.getBounds();

  const x = (xMax - xMin) / 2;
  const y = (yMax - yMin) / 2;
  
  const position = [x, y, -1];
  const focalPoint = [x, y, 0];
  const viewUp = [0, -1, 0];
  const parallelScale = Math.max(x, y) + 0.5; // Add fudge factor to make sure full image visible

  camera.set({ position, focalPoint, viewUp, parallelScale });
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

export function Slice(onKeyDown, onKeyUp) { 
  let interactor = null;
  let imageMapper = null;
  let sliceRanges = null;

  const manipulator = vtkMouseRangeManipulator.newInstance({
    scrollEnabled: true,
  });

  const interactorStyle = vtkInteractorStyleManipulator.newInstance();
  interactorStyle.addMouseManipulator(manipulator);

  return {
    initialize: renderWindow => {
      renderWindow.getCamera().setParallelProjection(true);

      interactor = renderWindow.getInteractor();
      interactor.setInteractorStyle(interactorStyle);

      interactor.onKeyDown(evt => {        
        if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
          if (!imageMapper) return;

          const extent = imageMapper.getInputData().getExtent();
          const kMin = extent[4];
          const kMax = extent[5];
      
          evt.key === 'ArrowUp' ? 
            imageMapper.setSlice(Math.min(kMax, imageMapper.getSlice() + 1)) :           
            imageMapper.setSlice(Math.max(kMin, imageMapper.getSlice() - 1));
        }
        else {
          onKeyDown(evt)
        }
      });
    
      interactor.onKeyUp(onKeyUp);
    },
    setImage: (imageActor, camera, volumeSliceRanges, onSliceChange) => {
      const firstTime = !imageMapper;

      imageMapper = imageActor.getMapper();
      const imageData = imageMapper.getInputData(); 

      sliceRanges = volumeSliceRanges ?? getSliceRanges(imageData);      

      resetCamera(camera, imageData);

      const extent = imageData.getExtent();
      const kMin = extent[4];
      const kMax = extent[5];
      const kGet = imageMapper.getSlice;
      const kSet = k => imageMapper.setSlice(k);

      manipulator.setScrollListener(kMin, kMax, -1, kGet, kSet, 1);
    
      if (firstTime) {
        const updateSlice = () => {  
          // Get slice position
          const ijk = [0, 0, 0];
          const position = [0, 0, 0];
    
          ijk[slicingMode] = imageMapper.getSlice();
          imageData.indexToWorld(ijk, position);

          // Update window/level
          const z = Math.floor(ijk[slicingMode]);
          setWindowLevel(imageActor, sliceRanges[z]);

          if (onSliceChange) onSliceChange(z, position);
        };

        imageMapper.onModified(updateSlice);
      }
    },
    setSliceByLabel: (imageMapper, maskData, label) => {
      imageMapper.setSlice(findFirstSlice(maskData, label));
      imageMapper.modified();
    },
    cleanUp: () => {
      console.log('Clean up slice');

      // Clean up anything we instantiated
      manipulator.delete();
    }
  };
}