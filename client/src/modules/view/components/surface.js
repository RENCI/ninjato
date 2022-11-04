import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

import vtkCalculator from 'vtk/filters/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/filters/discrete-flying-edges-3D';
//import { printShaders } from 'utils/shader-utils';
import { 
  SliceHighlightVP, SliceHighlightFP, 
  RegionHighlightVP, RegionHighlightFP,
  BackgroundSurfaceFP 
} from 'vtk/shaders';

const setTableColors = (table, highlight = null) => {
  for (let i = 0; i < table.getNumberOfTuples(); i++) {        
    table.setTuple(i, highlight?.label === i ? [255, 255, 255, 255] : [0, 0, 0, 255]);
  } 
};

export function Surface() {
  const maskCalculator = vtkCalculator.newInstance();

  const flyingEdges = vtkDiscreteFlyingEdges3D.newInstance({
    computeNormals: true,
    computeCoordinates: true
  });
  flyingEdges.setInputConnection(maskCalculator.getOutputPort());

  let sliceCalculator = null;

  // XXX: magic number, should use max value in background regions
  const numberOfColors = 2048;
  const colorTable = vtkDataArray.newInstance({
    numberOfComponents: 4,
    size: 4 * numberOfColors,
    dataType: 'Uint8Array',
  });
  
  const mapper = vtkMapper.newInstance();
  mapper.setScalarVisibility(false);  
  mapper.setInputConnection(flyingEdges.getOutputPort()); 
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 
  
  // Highlight code
  // XXX: Look into RenderPass to see if we can do some compositing to improve the effect 
  // (only render highlight that doesn't overlap with surface)
  // https://kitware.github.io/vtk-js/api/Rendering_SceneGraph_RenderPass.html
  const highlightMapper = vtkMapper.newInstance();
  highlightMapper.setScalarVisibility(false);        
  highlightMapper.getViewSpecificProperties().OpenGL = {
    VertexShaderCode: RegionHighlightVP,
    FragmentShaderCode: RegionHighlightFP
  };
  highlightMapper.getViewSpecificProperties().ShadersCallbacks = [
    {
      callback: (userData, cellBO) => {
        const cabo = cellBO.getCABO();

        let scale = [1, 1, 1];
        if (cabo.getCoordShiftAndScaleEnabled()) {
          scale = cabo.getCoordScale();
        }

        const program = cellBO.getProgram();
        program.setUniform3fArray('scale', Array.from(scale));
      }
    }
  ];
  highlightMapper.setInputConnection(flyingEdges.getOutputPort()); 

  const highlight = vtkActor.newInstance();
  highlight.getProperty().setFrontfaceCulling(true);
  highlight.setMapper(highlightMapper);

  return {
    getActor: () => actor,
    getHighlight: () => highlight,
    setInputData: data => maskCalculator.setInputData(data),
    getInputData: () => maskCalculator.getInputData(),
    setVisibility: visible => actor.setVisibility(visible),
    setOpaqueColor: color => {
      const property = actor.getProperty();
      property.setColor(color);
      property.setAmbient(0);
      property.setOpacity(1.0);
      property.setBackfaceCulling(false);

      highlight.getProperty().setColor(color);
    },
    setTranslucentColors: (color1, color2) => {
      const property = actor.getProperty();
      property.setDiffuseColor(color1);
      property.setAmbientColor(color2);
      property.setAmbient(0.8);
      property.setOpacity(0.4);
      property.setBackfaceCulling(true); 
      property.setInterpolationToFlat();

      mapper.setScalarVisibility(true);  
      mapper.setUseLookupTableScalarRange(true);
      
      mapper.getViewSpecificProperties().OpenGL = {
        FragmentShaderCode: BackgroundSurfaceFP
      };      

      const lut = mapper.getLookupTable();
      setTableColors(colorTable);
      lut.setNumberOfColors(numberOfColors);
      lut.setRange(0, numberOfColors);
      lut.setTable(colorTable);

      //printShaders(mapper);
    },
    setHighlightRegion: region => {
      setTableColors(colorTable, region)    ;
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
        sliceCalculator.setInputConnection(flyingEdges.getOutputPort());

        mapper.setInputConnection(sliceCalculator.getOutputPort());

        mapper.getViewSpecificProperties().OpenGL = {
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
    getLabels: () => flyingEdges.getValues(),
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
    getOutput: () => {
      mapper.update();
      return mapper.getInputData();
    },
    cleanUp: () => {
      console.log('Clean up surface');

      // Clean up anything we instantiated
      maskCalculator.delete();
      flyingEdges.delete();
      colorTable.delete();
      mapper.delete();
      actor.delete();
      highlightMapper.delete();
      highlight.delete();
      if (sliceCalculator) sliceCalculator.delete();
    }
  };
}