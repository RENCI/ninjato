import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkNinjatoPainter from 'vtk/ninjato-painter';
import vtkImageContour from 'vtk/image-contour';
import { Reds, Blues } from 'utils/colors';


const sliceMode = vtkImageMapper.SlicingMode.K;

export function Mask() {      
  let label = null;

  const backgroundColor = Blues[7];
  const regionColor = Reds[5];

  const painter = vtkNinjatoPainter.newInstance();
  painter.setSlicingMode(sliceMode);
  painter.setRadius(0.1);

  const contour = vtkImageContour.newInstance();
  contour.setInputConnection(painter.getOutputPort());

  const color = vtkColorTransferFunction.newInstance();
  
  const mapper = vtkMapper.newInstance();
  mapper.setUseLookupTableScalarRange(true);
  mapper.setLookupTable(color);
  mapper.setInputConnection(contour.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setLighting(false);

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

      color.removeAllPoints();
      color.addRGBPoint(0, 0, 0, 0);
      color.addRGBPoint(0, 0, 1, 0);
      if (label > 1) {
        color.addRGBPoint(1, ...backgroundColor);
        color.addRGBPoint(label - 1, ...backgroundColor);
      }
      color.addRGBPoint(label, ...regionColor);
      color.addRGBPoint(label + 1, ...backgroundColor);

      contour.setLabelOffsets({[label]: -0.01 });
    },
    getLabel: () => label,
    setEditMode: editMode => {
      painter.setLabel(editMode === 'erase' ? 0 : label);
      painter.setErase(editMode === 'erase');
    },
    setSlice: slice => contour.setSliceRange([slice, slice])
  };
}