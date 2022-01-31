import '@kitware/vtk.js/Rendering/Profiles/All';

//import vtkImageOutlineFilter from '@kitware/vtk.js/Filters/General/ImageOutlineFilter';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

import vtkNinjatoPainter from 'vtk/ninjato-painter';
import { Reds, Blues } from 'utils/colors';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Mask() {      
  const painter = vtkNinjatoPainter.newInstance();
  painter.setSlicingMode(sliceMode);
  painter.setLabel(255);
  painter.setRadius(0.1);

/*
  const outline = vtkImageOutlineFilter.newInstance();
  outline.setSlicingMode(sliceMode);
  outline.setInputConnection(painter.getOutputPort());
*/

  const mapper = vtkImageMapper.newInstance();
  mapper.setInputConnection(painter.getOutputPort());

  const color = vtkColorTransferFunction.newInstance();
  color.addRGBPoint(0, 0, 0, 0);
  color.addRGBPoint(1, ...Blues[5]);
  color.addRGBPoint(254, ...Blues[5]);
  color.addRGBPoint(255, ...Reds[5])

  const opacity = vtkPiecewiseFunction.newInstance();
  opacity.addPoint(0, 0);
  opacity.addPoint(1, 1);

  const actor = vtkImageSlice.newInstance();
  actor.getProperty().setInterpolationTypeToNearest();
  actor.getProperty().setRGBTransferFunction(color);
  actor.getProperty().setPiecewiseFunction(opacity);
  actor.getProperty().setOpacity(0.5);
  actor.setMapper(mapper);

  return {
    getPainter: () => painter,
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: (imageData, maskData) => {
      painter.setBackgroundImage(imageData);
      painter.setLabelMap(maskData);
    },
    setEditMode: editMode => {
      painter.setLabel(editMode === 'erase' ? 0 : 255);
      painter.setErase(editMode === 'erase');
    }
  };
}