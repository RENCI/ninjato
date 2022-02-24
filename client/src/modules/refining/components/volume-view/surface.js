import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';
import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';

import vtkCalculator from 'vtk/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/discrete-flying-edges-3D';
import { Reds, Blues } from 'utils/colors';

const regionFormula = label => (v => v === label ? 1 : 0);
const backgroundFormula = label => (v => v !== label && v !== 0 ? 1 : 0);

export function Surface(type = 'background') {
  const maskCalculator = vtkCalculator.newInstance();

  const flyingEdges = vtkDiscreteFlyingEdges3D.newInstance({
    values: [1],
    computeNormals: true,
    computeCoordinates: true
  });
  flyingEdges.setInputConnection(maskCalculator.getOutputPort());

  let sliceCalculator = null;
  
  const mapper = vtkMapper.newInstance();
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 
  actor.getProperty().setInterpolationToFlat();

  if (type === 'region') {
    sliceCalculator = vtkCalculator.newInstance();
    sliceCalculator.setFormulaSimple(
      FieldDataTypes.CELL,
      ['Coordinates'],
      'slice',
      coordinate => coordinate[2]
    );
    sliceCalculator.setInputConnection(flyingEdges.getOutputPort());

    mapper.setScalarVisibility(false);
    mapper.setInputConnection(sliceCalculator.getOutputPort());

    const mapperSpecificProp = mapper.getViewSpecificProperties();
    mapperSpecificProp['OpenGL'] = {
      VertexShaderCode: '',
      FragmentShaderCode: ''
    };
    mapperSpecificProp['OpenGL']['VertexShaderCode'] =
    `//VTK::System::Dec

    /*=========================================================================
    
      Program:   Visualization Toolkit
      Module:    vtkPolyDataVS.glsl
    
      Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
      All rights reserved.
      See Copyright.txt or http://www.kitware.com/Copyright.htm for details.
    
         This software is distributed WITHOUT ANY WARRANTY; without even
         the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
         PURPOSE.  See the above copyright notice for more information.
    
    =========================================================================*/
    
    attribute vec4 vertexMC;
    
    // frag position in VC
    //VTK::PositionVC::Dec

    // frag position in WC
    out vec4 positionWC;
    
    // optional normal declaration
    //VTK::Normal::Dec
    
    // extra lighting parameters
    //VTK::Light::Dec
    
    // Texture coordinates
    //VTK::TCoord::Dec
    
    // material property values
    //VTK::Color::Dec
    
    // clipping plane vars
    //VTK::Clip::Dec
    
    // camera and actor matrix values
    //VTK::Camera::Dec
    
    // Apple Bug
    //VTK::PrimID::Dec
    
    // picking support
    //VTK::Picking::Dec
    
    void main()
    {
      //VTK::Color::Impl
    
      //VTK::Normal::Impl
    
      //VTK::TCoord::Impl
    
      //VTK::Clip::Impl
    
      //VTK::PrimID::Impl
    
      //VTK::PositionVC::Impl
    
      //VTK::Light::Impl
    
      //VTK::Picking::Impl

      positionWC = vertexMC;
    }`;
    mapperSpecificProp['OpenGL']['FragmentShaderCode'] =
    `//VTK::System::Dec

    /*=========================================================================
    
      Program:   Visualization Toolkit
      Module:    vtkPolyDataFS.glsl
    
      Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
      All rights reserved.
      See Copyright.txt or http://www.kitware.com/Copyright.htm for details.
    
         This software is distributed WITHOUT ANY WARRANTY; without even
         the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
         PURPOSE.  See the above copyright notice for more information.
    
    =========================================================================*/
    // Template for the polydata mappers fragment shader
    
    uniform int PrimitiveIDOffset;

    uniform float sliceMin;
    uniform float sliceMax;
    uniform vec3 highlightColor;
    
    // VC position of this fragment
    //VTK::PositionVC::Dec

    in vec4 positionWC;
    
    // optional color passed in from the vertex shader, vertexColor
    //VTK::Color::Dec
    
    // optional surface normal declaration
    //VTK::Normal::Dec
    
    // extra lighting parameters
    //VTK::Light::Dec
    
    // Texture coordinates
    //VTK::TCoord::Dec
    
    // picking support
    //VTK::Picking::Dec
    
    // Depth Peeling Support
    //VTK::DepthPeeling::Dec
    
    // clipping plane vars
    //VTK::Clip::Dec
    
    // the output of this shader
    //VTK::Output::Dec
    
    // Apple Bug
    //VTK::PrimID::Dec
    
    // handle coincident offsets
    //VTK::Coincident::Dec
    
    //VTK::ZBuffer::Dec
    
    void main()
    {
      // VC position of this fragment. This should not branch/return/discard.
      //VTK::PositionVC::Impl
    
      // Place any calls that require uniform flow (e.g. dFdx) here.
      //VTK::UniformFlow::Impl
    
      // Set gl_FragDepth here (gl_FragCoord.z by default)
      //VTK::Depth::Impl
    
      // Early depth peeling abort:
      //VTK::DepthPeeling::PreColor
    
      // Apple Bug
      //VTK::PrimID::Impl
    
      //VTK::Clip::Impl
    
      //VTK::Color::Impl

      if (positionWC.z >= sliceMin && positionWC.z <= sliceMax) {
        diffuseColor = highlightColor;
      }
    
      // Generate the normal if we are not passed in one
      //VTK::Normal::Impl
    
      //VTK::TCoord::Impl
    
      //VTK::Light::Impl
    
      if (gl_FragData[0].a <= 0.0)
        {
        discard;
        }
    
      //VTK::DepthPeeling::Impl
    
      //VTK::Picking::Impl
    
      // handle coincident offsets
      //VTK::Coincident::Impl
    
      //VTK::ZBuffer::Impl
    }`;

    actor.getProperty().setColor(Reds[3]);
  }
  else {
    mapper.setInputConnection(flyingEdges.getOutputPort());
    mapper.setScalarVisibility(false);

    actor.getProperty().setDiffuseColor(Blues[2]);
    actor.getProperty().setAmbientColor(Blues[8]);
    actor.getProperty().setAmbient(0.8);
    actor.getProperty().setOpacity(0.4);
    actor.getProperty().setBackfaceCulling(true);
  }

  return {
    getActor: () => actor,
    setInputData: data => maskCalculator.setInputData(data),
    setLabel: label => {
      const formula = type === 'region' ? regionFormula(label) : backgroundFormula(label)

      maskCalculator.setFormulaSimple(
        FieldDataTypes.POINT,
        ['scalars'],
        'mask',
        value => formula(value)
      )
    },
    setSlice: slice => {      
      const bounds = mapper.getInputData().getBounds();
      const mid = (bounds[5] + bounds[4]) / 2;

      const input = maskCalculator.getInputData();
      let z = input.indexToWorld([0, 0, slice])[2]; 

      // XXX: Maybe use normal in fragment shader to handle edge cases?

      const e = 0.001;
      const w = z < bounds[4] || z > bounds[5] ? 0 : input.getSpacing()[2] / 2 + e;

      mapper.getViewSpecificProperties().ShadersCallbacks = [
        {
          userData: [z - w, z + w, Reds[5]],
          callback: function(userData, cellBO) {
            const program = cellBO.getProgram();
            program.setUniformf('sliceMin', userData[0]);
            program.setUniformf('sliceMax', userData[1]);
            program.setUniform3fArray('highlightColor', userData[2]);
          }
        }
      ];
    },
    getOutput: () => {
      mapper.update();
      return mapper.getInputData();
    },
    cleanUp: () => {
      console.log("Clean up surface");

      // Clean up anything we instantiated
      maskCalculator.delete();
      flyingEdges.delete();
      mapper.delete();
      actor.delete();
      if (sliceCalculator) sliceCalculator.delete();
    }
  };
}