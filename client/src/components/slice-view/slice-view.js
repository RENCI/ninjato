import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleImage  from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import { Widgets } from './widgets';
import { Image } from './image';
import { Mask } from './mask';

const sliceMode = vtkImageMapper.SlicingMode.K;

const setCamera = (sliceMode, renderer, data) => {
  const ijk = [0, 0, 0];
  const position = [0, 0, 0];
  const focalPoint = [0, 0, 0];
  data.indexToWorld(ijk, focalPoint);
  ijk[sliceMode] = 1;
  data.indexToWorld(ijk, position);
  renderer.getActiveCamera().set({ focalPoint, position });
  renderer.resetCamera();
};

export function SliceView(onEdit) {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let camera = null;

  const image = Image();
  const mask = Mask();  
  const widgets = Widgets(mask.getPainter(), onEdit);

  return {
    initialize: rootNode => {
      if (fullScreenRenderWindow) return;

      fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: rootNode,
        background: [0.9, 0.9, 0.9]
      });

      renderWindow = fullScreenRenderWindow.getRenderWindow();
      renderer = fullScreenRenderWindow.getRenderer();
      
      camera = renderer.getActiveCamera();
      camera.setParallelProjection(true);

      const style = vtkInteractorStyleImage.newInstance();
      style.setInteractionMode('IMAGE_SLICING');
      renderWindow.getInteractor().setInteractorStyle(style);

      widgets.setRenderer(renderer);
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);

      renderer.addViewProp(image.getActor());
      renderer.addViewProp(mask.getActor());
    
      mask.setInputData(imageData, maskData);
    
      // set 2D camera position
      setCamera(sliceMode, renderer, imageData);
    
      const update = () => {  
        const slicingMode = image.getMapper().getSlicingMode() % 3;

        if (slicingMode > -1) {
          const ijk = [0, 0, 0];
          const position = [0, 0, 0];
    
          // position
          ijk[slicingMode] = image.getMapper().getSlice();
          imageData.indexToWorld(ijk, position);
    
          widgets.getPaintWidget().getManipulator().setOrigin(position);

          mask.getPainter().setSlicingMode(slicingMode);
    
          widgets.getPaintHandle().updateRepresentationForRender();
    
          mask.getMapper().set(image.getMapper().get('slice', 'slicingMode'));
        }
      };

      image.getMapper().onModified(update);
      // trigger initial update
      update();   
    },
    cleanUp: () => {
      console.log("Clean up");
    }
  };
}