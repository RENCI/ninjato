import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

import vtkCalculator from 'vtk/filters/calculator';
//import { printShaders } from 'utils/shader-utils';
import { RegionHighlightVP, RegionHighlightFP } from 'vtk/shaders';

export function Highlight() {
  // XXX: Look into RenderPass to see if we can do some compositing to improve the effect 
  // (only render highlight that doesn't overlap with surface)
  // https://kitware.github.io/vtk-js/api/Rendering_SceneGraph_RenderPass.html
  const mapper = vtkMapper.newInstance();
  mapper.setScalarVisibility(false);        
  mapper.getViewSpecificProperties().OpenGL = {
    VertexShaderCode: RegionHighlightVP,
    FragmentShaderCode: RegionHighlightFP
  };
  mapper.getViewSpecificProperties().ShadersCallbacks = [
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

  const actor = vtkActor.newInstance();
  actor.getProperty().setFrontfaceCulling(true);
  actor.setMapper(mapper);

  return {
    getMapper: () => mapper,
    getActor: () => actor,
    cleanUp: () => {
      console.log('Clean up highlight');

      // Clean up anything we instantiated
      mapper.delete();
      actor.delete();
    }
  };
}