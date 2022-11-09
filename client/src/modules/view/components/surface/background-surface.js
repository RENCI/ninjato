import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

//import { printShaders } from 'utils/shader-utils';
import { BackgroundSurfaceFP } from 'vtk/shaders';

import { Surface } from './surface';

const hiddenValue = [0, 0, 0, 255];
const visibleValue = [255, 0, 0, 255];

const initializeTableColors = (table) => {
  for (let i = 0; i < table.getNumberOfTuples(); i++) {
    table.setTuple(i, visibleValue);
  }
}

// Hide visible/highlight regions, as they have their own surface
const updateTableColors = (table, regions = [], highlight = null) => { 
  regions.forEach(region => table.setTuple(region.label, region.visible ? hiddenValue : visibleValue));
  if (highlight) table.setTuple(highlight.label, hiddenValue);
};

export function BackgroundSurface() {
  let regions = [];

  const surface = Surface();

  const property = surface.getActor().getProperty();
  property.setAmbient(0.8);
  property.setOpacity(0.4);
  property.setBackfaceCulling(true); 
  property.setInterpolationToFlat();

  const mapper = surface.getMapper();
  mapper.setScalarVisibility(true);  
  mapper.setUseLookupTableScalarRange(true);      
  mapper.getViewSpecificProperties().OpenGL = {
    FragmentShaderCode: BackgroundSurfaceFP
  };

  // XXX: magic number, should use max value in background regions
  const numberOfColors = 2048;
  const colorTable = vtkDataArray.newInstance({
    numberOfComponents: 4,
    size: 4 * numberOfColors,
    dataType: 'Uint8Array',
  });
  
  const lut = mapper.getLookupTable();
  initializeTableColors(colorTable);
  lut.setNumberOfColors(numberOfColors);
  lut.setRange(0, numberOfColors);
  lut.setTable(colorTable);

  //printShaders(mapper);
  
  return {
    getActor: () => surface.getActor(),
    getHighlight: () => surface.getHighlight(),
    setInputData: data => surface.setInputData(data),
    getInputData: () => surface.getInputData(),
    setVisibility: visible => actor.setVisibility(visible),
    setNumberOfColors: (color1, color2) => {
      const property = surface.getActor().getProperty();
      property.setDiffuseColor(color1);
      property.setAmbientColor(color2);
    },
    setHighlightRegion: region => {
      updateTableColors(colorTable, regions, region);
      surface.getMapper().getLookupTable().setTable(colorTable);
    },
    updateVisibility: () => {
      updateTableColors(colorTable, regions);
      surface.getMapper().getLookupTable().setTable(colorTable);
    },    
    setRegions: regions => surface.setRegions(regions),
    getRegions: () => surface.getRegions(),
    getOutput: () => surface.getOutput(),
    cleanUp: () => {
      console.log('Clean up background surface');

      // Clean up anything we instantiated
      colorTable.delete();
      surface.cleanUp();
    }
  };
}