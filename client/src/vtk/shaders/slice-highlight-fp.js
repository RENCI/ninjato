// Fragment shader based on vtkPolyDataFS.glsl generated by vtk for flat shading,
// but performs slice highlighting.

export const SliceHighlightFP =
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

  // Slice highlighting
  uniform float sliceMin;
  uniform float sliceMax;
  uniform float borderWidth;
  uniform vec3 highlightColor;
  uniform vec3 borderColor;

  in vec4 positionFP;
  in vec3 normalFP;
  
  // VC position of this fragment
  in vec4 vertexVCVSOutput;
  
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

    // Slice highlighting
    const float epsilon = 0.00001;
    float minDist = abs(positionFP.z - sliceMin);
    float maxDist = abs(positionFP.z - sliceMax);
    if (
      (positionFP.z > sliceMin + epsilon && positionFP.z < sliceMax - epsilon) ||
      (minDist <= epsilon && normalFP.z < 0.0) || (maxDist <= epsilon && normalFP.z > 0.0)
    ) {
      if ((minDist >= epsilon && minDist <= borderWidth) || (maxDist >= epsilon && maxDist <= borderWidth)) {
        float x = smoothstep(0.0, borderWidth, min(minDist, maxDist) * 0.2);

        diffuseColor = mix(borderColor, highlightColor, x);
      }
      else {
        diffuseColor = highlightColor;
      }
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