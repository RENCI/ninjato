import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkPaintFilter from '@kitware/vtk.js/Filters/General/PaintFilter';
import vtkImageOutlineFilter from '@kitware/vtk.js/Filters/General/ImageOutlineFilter';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Mask() {      
  const painter = vtkPaintFilter.newInstance();
  painter.setSlicingMode(sliceMode);
  painter.setLabel(1);

  const outline = vtkImageOutlineFilter.newInstance();
  outline.setSlicingMode(sliceMode);
  outline.setInputConnection(painter.getOutputPort());

  const mapper = vtkImageMapper.newInstance();
  mapper.setInputConnection(outline.getOutputPort());

  const color = vtkColorTransferFunction.newInstance();
  color.addRGBPoint(1, 0, 0, 1);

  const opacity = vtkPiecewiseFunction.newInstance();
  opacity.addPoint(0, 0);
  opacity.addPoint(1, 1);

  const actor = vtkImageSlice.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setRGBTransferFunction(color);
  actor.getProperty().setPiecewiseFunction(opacity);
  actor.getProperty().setOpacity(0.5);

  return {
    getPainter: () => painter,
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: (imageData, maskData) => {
      painter.setBackgroundImage(imageData);
      painter.setLabelMap(maskData);
    }
  };
}