import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkImageContour from 'vtk/image-contour';
import { Reds, Blues } from 'utils/colors';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Mask() {      
  let label = null;

  const backgroundColor = Blues[7];
  const regionColor = Reds[5];

  const contour = vtkImageContour.newInstance();

  const color = vtkColorTransferFunction.newInstance();
  
  const mapper = vtkMapper.newInstance();
  mapper.setUseLookupTableScalarRange(true);
  mapper.setLookupTable(color);
  mapper.setInputConnection(contour.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setLighting(false);

  return {
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: maskData => {
      contour.setInputData(maskData);

      const [w, h] = maskData.getDimensions();
      contour.setWidth(Math.max(w, h) / 200);
    },
    setLabel: regionLabel => {
      label = regionLabel;

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
    setSlice: slice => contour.setSliceRange([slice, slice]),
    cleanUp: () => {
      console.log('Clean up mask');

      // Clean up anything we instantiated
      contour.delete();
      color.delete();
      mapper.delete();
      actor.delete();
    }
  };
}