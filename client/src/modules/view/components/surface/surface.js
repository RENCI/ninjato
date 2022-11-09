import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

import vtkCalculator from 'vtk/filters/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/filters/discrete-flying-edges-3D';
import { SliceHighlightVP, SliceHighlightFP } from 'vtk/shaders';

import { Highlight } from './highlight';

export function Surface() {
  let regions = [];

  const maskCalculator = vtkCalculator.newInstance();

  const flyingEdges = vtkDiscreteFlyingEdges3D.newInstance({
    computeNormals: true,
    computeCoordinates: true
  });
  flyingEdges.setInputConnection(maskCalculator.getOutputPort());

  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(flyingEdges.getOutputPort()); 
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);

  const highlight = Highlight();
  highlight.getMapper().setInputConnection(flyingEdges.getOutputPort());

  return {
    getMapper: () => mapper,
    getActor: () => actor,
    getHighlight: () => highlight.getActor(),
    setInputData: data => maskCalculator.setInputData(data),
    getInputData: () => maskCalculator.getInputData(),
    setVisibility: visible => actor.setVisibility(visible),
    setHighlightRegion: region => {
      updateTableColors(colorTable, regions, region);
      mapper.getLookupTable().setTable(colorTable);
    },
    setSliceHighlight: highlight => {
      if (highlight) {
        if (!sliceCalculator) sliceCalculator = vtkCalculator.newInstance();

        sliceCalculator.setFormulaSimple(
          FieldDataTypes.CELL,
          ['Coordinates'],
          'slice',
          coordinate => coordinate[2]
        );
        sliceCalculator.setInputConnection(surface.getOutputPort());

        mapper.setInputConnection(sliceCalculator.getOutputPort());

        mapper.getViewSpecificProperties().OpenGL = {
          VertexShaderCode: SliceHighlightVP,
          FragmentShaderCode: SliceHighlightFP
        };
      }
      else {
        mapper.setInputConnection(surface.getOutputPort());
        
        if (sliceCalculator) sliceCalculator.delete();
      }
    },
    setSlice: (slice, colors) => {      
      if (!sliceCalculator) return;

      const input = maskCalculator.getInputData();
      const z = input.indexToWorld([0, 0, slice])[2]; 
      const sliceWidth = input.getSpacing()[2];
      const borderWidth = sliceWidth / 8;      
      const [c1, c2] = colors;

      mapper.getViewSpecificProperties().ShadersCallbacks = [
        {
          userData: [z, sliceWidth / 2, borderWidth, c1, c2],
          callback: ([z, halfWidth, borderWidth, color, borderColor], cellBO) => {
            const cabo = cellBO.getCABO();
            if (cabo.getCoordShiftAndScaleEnabled()) {
              const shift = cabo.getCoordShift()[2];
              const scale = cabo.getCoordScale()[2];

              z -= shift;
              z *= scale;
              halfWidth *= scale;
              borderWidth *= scale;
            }

            const program = cellBO.getProgram();
            program.setUniformf('sliceMin', z - halfWidth);
            program.setUniformf('sliceMax', z + halfWidth);
            program.setUniformf('borderWidth', borderWidth);
            program.setUniform3fArray('highlightColor', color);
            program.setUniform3fArray('borderColor', borderColor);
          }
        }
      ];
    },
    setRegions: (regionArray) => {
      regions = regionArray;

      const labels = regions.map(({ label }) => label);
      const formula = label => labels.includes(label) ? label : 0;

      // XXX: Shouldn't need mask calculator any more, but it is causing some issues with the slice highlighting
      // when removed. Investigate more at some point...
      maskCalculator.setFormulaSimple(
        FieldDataTypes.POINT,
        ['scalars'],
        'mask',
        value => formula(value)
      );

      flyingEdges.setValues(labels);
    },
    getLabels: () => flyingEdges.getValues(),
    getOutput: () => {
      mapper.update();
      return mapper.getInputData();
    },
    getOutputPort: () => flyingEdges.getOutputPort(),
    cleanUp: () => {
      console.log('Clean up surface');

      // Clean up anything we instantiated
      maskCalculator.delete();
      flyingEdges.delete();
      mapper.delete();
      actor.delete();
      if (sliceCalculator) sliceCalculator.delete();
    }
  };
}