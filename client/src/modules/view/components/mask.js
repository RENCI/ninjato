import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkImageContour from 'vtk/image-contour';
import { Reds, Blues, Purples } from 'utils/colors';

export function Mask() {      
  let label = null;
  let activeLabels = [];
  let highlightLabel = null;

  const backgroundColor = Blues[7];
  const regionColor = Reds[5];
  const activeColor = Purples[6];
  const highlightColor = Purples[5];

  const contour = vtkImageContour.newInstance();

  const color = vtkColorTransferFunction.newInstance();
  
  const mapper = vtkMapper.newInstance();
  mapper.setUseLookupTableScalarRange(true);
  mapper.setLookupTable(color);
  mapper.setInputConnection(contour.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setLighting(false);

  const updateColors = () => {
    // Initialize
    color.removeAllPoints();
    color.addRGBPoint(0, 0, 0, 0);
    color.addRGBPoint(1, ...backgroundColor);

    // Set background start and end points between special labels
    [label, ...activeLabels, highlightLabel].filter(label => label !== null).forEach(label => {
      if (label > 1) color.addRGBPoint(label - 1, ...backgroundColor);
      color.addRGBPoint(label + 1, ...backgroundColor);
    });

    // Set special labels
    activeLabels.forEach(label => color.addRGBPoint(label, ...activeColor));
    color.addRGBPoint(label, ...regionColor);
    if (highlightLabel) color.addRGBPoint(highlightLabel, ...highlightColor); 
  };

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
      updateColors();
      contour.setLabelOffsets({[label]: -0.01 });
    },
    getLabel: () => label,
    setActiveLabels: labels => {
      activeLabels = labels;
      updateColors();
    },
    setHighlightLabel: label => {
      highlightLabel = label;
      updateColors();
    },
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