import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkNinjatoPainter from 'vtk/ninjato-painter';
import vtkImageContour from 'vtk/image-contour';
import { Reds, Blues } from 'utils/colors';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function MaskPainter() {      
  let labels = [];
  let activeLabel = null;
  let highlightLabel = null;

  const backgroundColor = Blues[7];
  const regionColor = [0.5, 0.5, 0.5];
  const activeColor = Reds[5];
  const highlightColor = Reds[4];

  const painter = vtkNinjatoPainter.newInstance();
  painter.setSlicingMode(sliceMode);

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

  const updateColors = () => {
    // Initialize
    color.removeAllPoints();
    color.addRGBPoint(0, 0, 0, 0);
    color.addRGBPoint(1, ...backgroundColor);

    // Set background start and end points between labels
    [...labels, highlightLabel].filter(label => label !== null).forEach(label => {
      if (label > 1) color.addRGBPoint(label - 1, ...backgroundColor);
      color.addRGBPoint(label + 1, ...backgroundColor);
    });

    // Set labels
    labels.forEach(label => color.addRGBPoint(label, ...regionColor));
    if (activeLabel) color.addRGBPoint(activeLabel, ...activeColor);
    if (highlightLabel) color.addRGBPoint(highlightLabel, ...highlightColor); 
  };

  return {
    getPainter: () => painter,
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: maskData => {
      painter.setBackgroundImage(maskData);
      painter.setLabelMap(maskData);

      const [w, h] = maskData.getDimensions();
      contour.setWidth(Math.max(w, h) / 200);
    },
    setLabels: regionLabels => {
      labels = regionLabels;

      updateColors();
    },
    setActiveLabel: label => {
      activeLabel = label;

      painter.setLabel(label);

      updateColors();
      
      contour.setLabelOffsets({[label]: -0.01 });
    },
    getActiveLabel: () => activeLabel,
    setHighlightLabel: label => {
      highlightLabel = label;
      updateColors();
    },
    setSlice: slice => contour.setSliceRange([slice, slice]),
    cleanUp: () => {
      console.log('Clean up mask');

      // Clean up anything we instantiated
      painter.delete();
      contour.delete();
      color.delete();
      mapper.delete();
      actor.delete();
    }
  };
}