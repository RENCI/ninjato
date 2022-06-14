import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

import vtkImageContour from 'vtk/image-contour';
import { backgroundColors } from 'utils/colors';

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
    regions.forEach(({ label, colors }) => color.addRGBPoint(label, colors[label === activeLabel ? 'contourActive' : 'contour']));
    if (highlightRegion) color.addRGBPoint(highlightRegion.label, highlightRegion.colors.contourHighlight);

  };

  return {
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: maskData => {
      contour.setInputData(maskData);

      const [w, h] = maskData.getDimensions();
      contour.setWidth(Math.max(w, h) / 200);
    },
    setRegions: regionArray => {
      regions = regionArray;
      updateColors();
    },
    setActiveRegion: region => {
      activeRegion = region;
      updateColors();
      contour.setLabelOffsets({[region.label]: -0.01 });
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
      contour.delete();
      color.delete();
      mapper.delete();
      actor.delete();
    }
  };
}