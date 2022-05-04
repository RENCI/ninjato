import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

import vtkCalculator from 'vtk/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/discrete-flying-edges-3D';
import { SliceHighlightVP, SliceHighlightFP } from 'vtk/shaders';
import { regionSliceHighlightColors } from 'utils/colors';

export function Surface() {
  const maskCalculator = vtkCalculator.newInstance();

  const flyingEdges = vtkDiscreteFlyingEdges3D.newInstance({
    computeNormals: true,
    computeCoordinates: true
  });
  flyingEdges.setInputConnection(maskCalculator.getOutputPort());

  let sliceCalculator = null;
  
  const mapper = vtkMapper.newInstance();
  mapper.setScalarVisibility(false);
  mapper.setInputConnection(flyingEdges.getOutputPort()); 
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 

  return {
    getActor: () => actor,
    setInputData: data => maskCalculator.setInputData(data),
    getInputData: () => maskCalculator.getInputData(),
    setOpaqueColor: color => {
      const property = actor.getProperty();
      property.setColor(color);
      property.setAmbient(0);
      property.setOpacity(1);
      property.setBackfaceCulling(false);
    },
    setTranslucentColors: (color1, color2) => {
      const property = actor.getProperty();
      property.setDiffuseColor(color1);
      property.setAmbientColor(color2);
      property.setAmbient(0.8);
      property.setOpacity(0.4);
      property.setBackfaceCulling(true); 
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
        sliceCalculator.setInputConnection(flyingEdges.getOutputPort());

        mapper.setInputConnection(sliceCalculator.getOutputPort());

        const mapperSpecificProp = mapper.getViewSpecificProperties();
        mapperSpecificProp.OpenGL = {
          VertexShaderCode: SliceHighlightVP,
          FragmentShaderCode: SliceHighlightFP
        };
      }
      else {
        mapper.setInputConnection(flyingEdges.getOutputPort());
        
        if (sliceCalculator) sliceCalculator.delete();
      }
    },
    setLabels: labels => {
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
    setSlice: (slice, colors) => {      
      if (!sliceCalculator) return;

      const input = maskCalculator.getInputData();
      const z = input.indexToWorld([0, 0, slice])[2]; 
      const sliceWidth = input.getSpacing()[2];
      const borderWidth = sliceWidth / 8;      
      
      //const labels = flyingEdges.getValues();
      //const [c1, c2] = labels.length > 0 ? regionSliceHighlightColors(labels[0]) : [[0, 0, 0], [1, 1, 1]];
      const [c1, c2] = colors;

      mapper.getViewSpecificProperties().ShadersCallbacks = [
        {
          userData: [z, sliceWidth / 2, borderWidth, c1, c2],
          callback: ([z, halfWidth, borderWidth, color, borderColor], cellBO) => {
            const cabo = cellBO.getCABO();
            if (cabo.getCoordShiftAndScaleEnabled()) {
              const scale = cabo.getCoordScale()[2];
              const shift = cabo.getCoordShift()[2];

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
    getOutput: () => {
      mapper.update();
      return mapper.getInputData();
    },
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