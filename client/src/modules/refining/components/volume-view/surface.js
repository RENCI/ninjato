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
  //actor.getProperty().setInterpolationToFlat();

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
    `#version 300 es
    #define attribute in
    #define textureCube texture
    #define texture2D texture
    #define textureCubeLod textureLod
    #define texture2DLod textureLod
    
    
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
    #else
    precision mediump float;
    precision mediump int;
    #endif
    
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
    out vec4 positionWC;

    attribute vec3 normalMC;
    out vec3 normalWC;
    
    // frag position in VC
    out vec4 vertexVCVSOutput;
    
    // camera and actor matrix values
    uniform mat4 MCPCMatrix;
    uniform mat4 MCVCMatrix;
    
    void main()
    {
      vertexVCVSOutput = MCVCMatrix * vertexMC;
      gl_Position = MCPCMatrix * vertexMC;

      positionWC = vertexMC;
      normalWC = normalMC;
    }`;
    mapperSpecificProp['OpenGL']['FragmentShaderCode'] =
    `#version 300 es
    #define attribute in
    #define textureCube texture
    #define texture2D texture
    #define textureCubeLod textureLod
    #define texture2DLod textureLod
    
    
    
    
    
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
    #else
    precision mediump float;
    precision mediump int;
    #endif
    
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
    
    // VC position of this fragment
    in vec4 vertexVCVSOutput;

    in vec4 positionWC;
    in vec3 normalWC;
    
    // optional color passed in from the vertex shader, vertexColor
    uniform float ambient;
    uniform float diffuse;
    uniform float specular;
    uniform float opacityUniform; // the fragment opacity
    uniform vec3 ambientColorUniform;
    uniform vec3 diffuseColorUniform;
    uniform vec3 specularColorUniform;
    uniform float specularPowerUniform;
    
    // optional surface normal declaration
    uniform int cameraParallel;
    
    // picking support
    uniform vec3 mapperIndex;
    uniform int picking;
    
    // the output of this shader
    layout(location = 0) out vec4 fragOutput0;
    
    // handle coincident offsets
    uniform float cfactor;
    // XXX: HAD TO REMOVE THIS
    //uniform float coffset;
    
    void main()
    {
      // VC position of this fragment. This should not branch/return/discard.
      vec4 vertexVC = vertexVCVSOutput;
    
      // Place any calls that require uniform flow (e.g. dFdx) here.
        vec3 fdx = dFdx(vertexVC.xyz);
      vec3 fdy = dFdy(vertexVC.xyz);
      float cscale = length(vec2(dFdx(gl_FragCoord.z),dFdy(gl_FragCoord.z)));
    
      // Set gl_FragDepth here (gl_FragCoord.z by default)
      // XXX: HAD TO REMOVE coffset
      //gl_FragDepth = gl_FragCoord.z + cfactor*cscale + 0.000016*coffset;
      gl_FragDepth = gl_FragCoord.z + cfactor*cscale + 0.000016;
    
      vec3 ambientColor;
      vec3 diffuseColor;
      float opacity;
      vec3 specularColor;
      float specularPower;
      ambientColor = ambientColorUniform;
      diffuseColor = diffuseColorUniform;
      opacity = opacityUniform;
      specularColor = specularColorUniform;
      specularPower = specularPowerUniform;

      if (positionWC.z > 5.0 && normalWC.z > 0.95) {
        diffuseColor = vec3(0.0, 1.0, 0.0);
      }
    
      // Generate the normal if we are not passed in one
        fdx = normalize(fdx);
      fdy = normalize(fdy);
      vec3 normalVCVSOutput = normalize(cross(fdx,fdy));
      if (cameraParallel == 1 && normalVCVSOutput.z < 0.0) { normalVCVSOutput = -1.0*normalVCVSOutput; }
      if (cameraParallel == 0 && dot(normalVCVSOutput,vertexVC.xyz) > 0.0) { normalVCVSOutput = -1.0*normalVCVSOutput; }
    
        float df = max(0.0, normalVCVSOutput.z);
      float sf = pow(df, specularPower);
      vec3 diffuseL = df * diffuseColor;
      vec3 specularL = sf * specularColor;
      fragOutput0 = vec4(ambientColor * ambient + diffuseL * diffuse + specularL * specular, opacity);
    
      if (fragOutput0.a <= 0.0)
        {
        discard;
        }
    
        fragOutput0 = picking != 0 ? vec4(mapperIndex,1.0) : fragOutput0;
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

            console.log(program.getVertexShader().getSource());
            console.log(program.getFragmentShader().getSource());
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