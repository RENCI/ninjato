import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkInteractorStyleImage  from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
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

export function SliceView() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;
  let camera = null;
  let widgets = null;

  const painter = vtkPaintFilter.newInstance();
  painter.setSlicingMode(sliceMode);
  painter.setLabel(1);

  const image = Image();
  const labelMap = Mask(painter);

  return {
    initialize: (rootNode, onEdit) => {
      if (fullScreenRenderWindow) return;

      fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: rootNode,
        background: [0.9, 0.9, 0.9]
      });

      renderWindow = fullScreenRenderWindow.getRenderWindow();
      renderer = fullScreenRenderWindow.getRenderer();
      camera = renderer.getActiveCamera();

      // Setup 2D view
      camera.setParallelProjection(true);

      const iStyle = vtkInteractorStyleImage.newInstance();
      iStyle.setInteractionMode('IMAGE_SLICING');
      renderWindow.getInteractor().setInteractorStyle(iStyle);

      widgets = Widgets(renderer, painter, onEdit);
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);

      renderer.addViewProp(image.actor);
      renderer.addViewProp(labelMap.actor);
    
      // update paint filter
      painter.setBackgroundImage(imageData);
      painter.setLabelMap(maskData);
    
      // set 2D camera position
      setCamera(sliceMode, renderer, imageData);
    
      const update = () => {  
        const slicingMode = image.mapper.getSlicingMode() % 3;

        if (slicingMode > -1) {
          const ijk = [0, 0, 0];
          const position = [0, 0, 0];
    
          // position
          ijk[slicingMode] = image.mapper.getSlice();
          imageData.indexToWorld(ijk, position);
    
          widgets.paintWidget.getManipulator().setOrigin(position);

          painter.setSlicingMode(slicingMode);
    
          widgets.paintHandle.updateRepresentationForRender();
    
          // update labelMap layer
          labelMap.mapper.set(image.mapper.get('slice', 'slicingMode'));
        }
      };

      image.mapper.onModified(update);
      // trigger initial update
      update();   
    },
    cleanUp: () => {
      console.log("Clean up");
    }
  };
}