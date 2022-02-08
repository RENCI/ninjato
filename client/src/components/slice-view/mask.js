import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

import vtkNinjatoPainter from 'vtk/ninjato-painter';
import vtkImageContour from 'vtk/image-contour';
import { Reds, Blues } from 'utils/colors';


import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Mask() {      
  let label = null;

  const backgroundColor = Blues[5];
  const regionColor = Reds[5];

  const painter = vtkNinjatoPainter.newInstance();
  painter.setSlicingMode(sliceMode);
  painter.setRadius(0.1);

  const contour = vtkImageContour.newInstance();
  contour.setInputConnection(painter.getOutputPort());

/*  
  const mapper = vtkImageMapper.newInstance();
  mapper.setInputConnection(contour.getOutputPort());  
  
  const opacity = vtkPiecewiseFunction.newInstance();
  opacity.addPoint(0, 0);
  opacity.addPoint(1, 1);

  const actor = vtkImageSlice.newInstance();
  actor.getProperty().setInterpolationTypeToNearest();
  actor.getProperty().setOpacity(0.5);
  actor.setMapper(mapper);
*/
  const line = vtkLineSource.newInstance({
    point1: [0, 0, 0],
    point2: [20, 20, 0]
  });
  
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(contour.getOutputPort());
  mapper.setResolveCoincidentTopology(true);
  mapper.setResolveCoincidentTopologyPolygonOffsetParameters(-1, -1);

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setColor([1, 0, 0]);

  return {
    getPainter: () => painter,
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: (imageData, maskData) => {
      painter.setBackgroundImage(imageData);
      painter.setLabelMap(maskData);
    },
    setLabel: regionLabel => {
      label = regionLabel;
      
      painter.setLabel(label);

      const color = vtkColorTransferFunction.newInstance();
      color.addRGBPoint(0, 0, 0, 0);
      if (label > 1) {
        color.addRGBPoint(1, ...backgroundColor);
        color.addRGBPoint(label - 1, ...backgroundColor);
      }
      color.addRGBPoint(label, ...regionColor);
      color.addRGBPoint(label + 1, ...backgroundColor);

      //actor.getProperty().setRGBTransferFunction(color);
      //actor.getProperty().setPiecewiseFunction(opacity);
    },
    getLabel: () => label,
    setEditMode: editMode => {
      painter.setLabel(editMode === 'erase' ? 0 : label);
      painter.setErase(editMode === 'erase');
    }
  };
}