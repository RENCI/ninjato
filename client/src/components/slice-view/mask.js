import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction  from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

export function Mask(painter) {
  const mapper = vtkImageMapper.newInstance();
  const actor = vtkImageSlice.newInstance();
  const cfun = vtkColorTransferFunction.newInstance();
  const ofun = vtkPiecewiseFunction.newInstance();

  actor.setMapper(mapper);
  mapper.setInputConnection(painter.getOutputPort());

  cfun.addRGBPoint(1, 0, 0, 1); // label "1" will be blue
  ofun.addPoint(0, 0); // our background value, 0, will be invisible
  ofun.addPoint(1, 1); // all values above 1 will be fully opaque

  actor.getProperty().setRGBTransferFunction(cfun);
  actor.getProperty().setPiecewiseFunction(ofun);
  actor.getProperty().setOpacity(0.5);

  return {
    getActor: () => actor,
    getMapper: () => mapper
  };
}