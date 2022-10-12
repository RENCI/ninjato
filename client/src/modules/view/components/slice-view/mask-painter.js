import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkNinjatoPainter from 'vtk/filters/ninjato-painter';
import vtkImageContour from 'vtk/filters/image-contour';
import { backgroundColors } from 'utils/colors';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function MaskPainter() {      
  let regions = [];
  let activeRegion = null;
  let highlightRegion = null;

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
    const backgroundColor = backgroundColors.contour;

    // Initialize
    color.removeAllPoints();
    color.addRGBPoint(0, 0, 0, 0);
    color.addRGBPoint(1, ...backgroundColors.contour);

    // Set background start and end points between labels
    [...regions, highlightRegion].filter(region => region !== null).forEach(({ label }) => {
      if (label > 1) color.addRGBPoint(label - 1, ...backgroundColor);
      color.addRGBPoint(label + 1, ...backgroundColor);
    });

    // Set labels
    regions.forEach(({ label, colors }) =>       
      color.addRGBPoint(label, ...colors[label === activeRegion?.label ? 'contourActive' : 'contour']));
    if (highlightRegion) color.addRGBPoint(highlightRegion.label, ...(highlightRegion.colors?.contourHighlight ?? backgroundColors.contourHighlight));

    // Set z offsets
    const offsets = regions.reduce((offsets, { label }) => {
      offsets[label] = -0.01;
      return offsets;
    }, {});

    if (activeRegion) offsets[activeRegion.label] = -0.02;
    if (highlightRegion) offsets[highlightRegion.label] = -0.03;

    contour.setLabelOffsets(offsets);
  };

  return {
    getPainter: () => painter,
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: maskData => {
      painter.setBackgroundImage(maskData, regions.map(({ label }) => label));
      painter.setLabelMap(maskData);

      const [w, h] = maskData.getDimensions();
      contour.setWidth(Math.max(w, h) / 200);
    },
    setRegions: regionArray => {
      regions = regionArray;
      updateColors();
    },
    setActiveRegion: region => {
      activeRegion = region;

      painter.setLabel(region?.label);

      updateColors();            
    },
    getActiveRegion: () => activeRegion,
    setHighlightRegion: region => {
      highlightRegion = region;      
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