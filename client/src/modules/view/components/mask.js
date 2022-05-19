import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkImageContour from 'vtk/image-contour';
import { regionContourColor } from 'utils/colors';

export function Mask() {      
  let labels = [];
  let activeLabel = null;
  let highlightLabel = null;

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
    const backgroundColor = regionContourColor();

    // Initialize
    color.removeAllPoints();
    color.addRGBPoint(0, 0, 0, 0);
    color.addRGBPoint(1, ...backgroundColor);

    // Set background start and end points between labels
    [...labels, activeLabel, highlightLabel].filter(label => label !== null).forEach(label => {
      if (label > 1) color.addRGBPoint(label - 1, ...backgroundColor);
      color.addRGBPoint(label + 1, ...backgroundColor);
    });

    
    // Set labels
    labels.forEach((label, i) => color.addRGBPoint(label, ...regionContourColor(i, label === activeLabel ? 'active' : null )));
    if (highlightLabel) color.addRGBPoint(highlightLabel, ...regionContourColor(labels.indexOf(highlightLabel), 'highlight'));
  };

  return {
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: maskData => {
      contour.setInputData(maskData);

      const [w, h] = maskData.getDimensions();
      contour.setWidth(Math.max(w, h) / 200);
    },
    setActiveLabel: label => {
      activeLabel = label;
      updateColors();
      contour.setLabelOffsets({[label]: -0.01 });
    },
    getActiveLabel: () => activeLabel,
    setLabels: regionLabels => {
      labels = regionLabels;
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