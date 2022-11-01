import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

import vtkCalculator from 'vtk/filters/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/filters/discrete-flying-edges-3D';
import { 
  SliceHighlightVP, SliceHighlightFP, 
  RegionHighlightVP, RegionHighlightFP,
  BackgroundSurfaceVP, BackgroundSurfaceFP 
} from 'vtk/shaders';

export function Surface() {
  const maskCalculator = vtkCalculator.newInstance();

  const flyingEdges = vtkDiscreteFlyingEdges3D.newInstance({
    computeNormals: true,
    computeCoordinates: true
  });
  flyingEdges.setInputConnection(maskCalculator.getOutputPort());

  let sliceCalculator = null;

  let color = vtkColorTransferFunction.newInstance();
  
  const mapper = vtkMapper.newInstance();
  mapper.setScalarVisibility(true);  
  mapper.setInputConnection(flyingEdges.getOutputPort()); 
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 
  
  // XXX: Highlight code
  // Look into RenderPass to see if we can do some compositing to improve the effect 
  // (only render highlight that doesn't overlap with surface)
  // https://kitware.github.io/vtk-js/api/Rendering_SceneGraph_RenderPass.html
  const highlightMapper = vtkMapper.newInstance();
  highlightMapper.setScalarVisibility(false);        
  highlightMapper.getViewSpecificProperties().OpenGL = {
    VertexShaderCode: RegionHighlightVP,
    FragmentShaderCode: RegionHighlightFP
  };
  highlightMapper.setInputConnection(flyingEdges.getOutputPort()); 

  const highlight = vtkActor.newInstance();
  highlight.getProperty().setFrontfaceCulling(true);
  highlight.setMapper(highlightMapper);

  return {
    getActor: () => actor,
    getHighlight: () => highlight,
    setInputData: data => maskCalculator.setInputData(data),
    getInputData: () => maskCalculator.getInputData(),
    setOpaqueColor: color => {
      const property = actor.getProperty();
      property.setColor(color);
      property.setAmbient(0);
      property.setOpacity(1);
      property.setBackfaceCulling(false);

      highlight.getProperty().setColor(color);
    },
    setTranslucentColors: (color1, color2) => {
      const property = actor.getProperty();
      //property.setDiffuseColor(color1);
      //property.setAmbientColor(color2);
      //property.setAmbient(0.8);
      //property.setOpacity(0.4);
      //property.setBackfaceCulling(true); 

      //property.setColor([0.5, 0.5, 0.5])


  mapper.setCustomShaderAttributes(['scalars'])

  // XXX: Look into useAttributeArray
  // https://kitware.github.io/vtk-js/api/Rendering_OpenGL_ShaderProgram.html

      mapper.getViewSpecificProperties().OpenGL = {
        VertexShaderCode: BackgroundSurfaceVP,
        FragmentShaderCode: BackgroundSurfaceFP
      };
      



// XXX: THIS SORT OF WORKS, BUT OPACITY DOESN'T WORK PROPERLY
/*


  mapper.setScalarVisibility(true);  
  mapper.setUseLookupTableScalarRange(true);
  mapper.setInterpolateScalarsBeforeMapping(false);

      const lut = mapper.getLookupTable();
      
      console.log(lut);

      const numberOfColors = 2048;

      const table = vtkDataArray.newInstance({
        numberOfComponents: 4,
        size: 4 * numberOfColors,
        dataType: 'Uint8Array',
      });

      for (let i = 0; i < numberOfColors; i++) {        
        table.setTuple(i, i === 490 ? [255, 255, 255, 255] : [255, 0, 255, 200]);
        //table.setTuple(i, [255, 255, 255, 255]);
      }
      lut.setNumberOfColors(numberOfColors);
      lut.setRange(0, numberOfColors);
      lut.setAlphaRange(0, 255);
      lut.setTable(table);
      lut.setAlphaRange(0, 255);
*/

/*
mapper.getViewSpecificProperties().OpenGL = {
  VertexShaderCode: BackgroundSurfaceFP,
  FragmentShaderCode: BackgroundSurfaceVP
};
*/
    
    

    },
    setHighlightRegion: region => {
      color.removeAllPoints();
      color.addRGBPoint(1, 1, 1, 1);
      if (region) {
        color.addRGBPoint(region.label - 1, 1, 1, 1);
        color.addRGBPoint(region.label, 0, 0, 0);
        color.addRGBPoint(region.label + 1, 1, 1, 1);
      }
      color.addRGBPoint(Number.MAX_SAFE_INTEGER, 1, 1, 1);
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
      highlightMapper.delete();
      highlight.delete();
      if (sliceCalculator) sliceCalculator.delete();
    }
  };
}