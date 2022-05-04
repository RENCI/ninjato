import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkNinjatoPainter from 'vtk/ninjato-painter';
import vtkImageContour from 'vtk/image-contour';
import { 
  backgroundContourColor, 
  regionContourColor, 
  regionContourHighlightColor 
} from 'utils/colors';

const sliceMode = vtkImageMapper.SlicingMode.K;

const backgroundColor = backgroundContourColor;

export function MaskPainter() {      
  let labels = [];
  let activeLabel = null;
  let highlightLabel = null;

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
    [...labels, activeLabel, highlightLabel].filter(label => label !== null).forEach(label => {
      if (label > 1) color.addRGBPoint(label - 1, ...backgroundColor);
      color.addRGBPoint(label + 1, ...backgroundColor);
    });

    // Set labels
    labels.forEach((label, i) => color.addRGBPoint(label, ...regionContourColor(i, label === activeLabel)));
    if (highlightLabel) color.addRGBPoint(highlightLabel, ...regionContourHighlightColor(labels.indexOf(highlightLabel))); 

    // Set z offsets
    const offsets = labels.reduce((offsets, label) => {
      offsets[label] = -0.01;
      return offsets;
    }, {});

    if (activeLabel) offsets[activeLabel] = -0.02;
    if (highlightLabel) offsets[highlightLabel] = -0.03;

    contour.setLabelOffsets(offsets);
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