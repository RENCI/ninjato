// Fragment shader based on vtkPolyDataFS.glsl

export const BackgroundSurfaceFP =
  `//VTK::System::Dec
    
  uniform int PrimitiveIDOffset;

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
  in vec4 vertexColorVSOutput;

  // optional surface normal declaration
  uniform int cameraParallel;

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
  layout(location = 0) out vec4 fragOutput0;
  layout(location = 1) out vec4 fragOutput1;


  // Apple Bug
  //VTK::PrimID::Dec

  // handle coincident offsets
  uniform float cfactor;
  uniform float coffset;

  //VTK::ZBuffer::Dec

  void main()
  {
    // VC position of this fragment. This should not branch/return/discard.
    vec4 vertexVC = vertexVCVSOutput;

    // Place any calls that require uniform flow (e.g. dFdx) here.
  //    vec3 fdx = dFdx(vertexVC.xyz);
  //  vec3 fdy = dFdy(vertexVC.xyz);
  //  float cscale = length(vec2(dFdx(gl_FragCoord.z),dFdy(gl_FragCoord.z)));
  //VTK::UniformFlow::Impl

    // Set gl_FragDepth here (gl_FragCoord.z by default)
    gl_FragDepth = gl_FragCoord.z + cfactor*cscale + 0.000016*coffset;

    // Early depth peeling abort:
    //VTK::DepthPeeling::PreColor

    // Apple Bug
    //VTK::PrimID::Impl

    //VTK::Clip::Impl

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
  //  diffuseColor = vertexColorVSOutput.rgb;
  //  ambientColor = vertexColorVSOutput.rgb;
  //  opacity = opacity*vertexColorVSOutput.a;

    // Generate the normal if we are not passed in one
    fdx = normalize(fdx);
    fdy = normalize(fdy);
    vec3 normalVCVSOutput = normalize(cross(fdx,fdy));
    if (cameraParallel == 1 && normalVCVSOutput.z < 0.0) { normalVCVSOutput = -1.0*normalVCVSOutput; }
    if (cameraParallel == 0 && dot(normalVCVSOutput,vertexVC.xyz) > 0.0) { normalVCVSOutput = -1.0*normalVCVSOutput; }

    //VTK::TCoord::Impl

    float df = max(0.0, normalVCVSOutput.z);
    float sf = pow(df, specularPower);
    vec3 diffuseL = df * diffuseColor;
    vec3 specularL = sf * specularColor;

    float o = vertexColorVSOutput.r;
    opacity = o == 0.0 ? 0.0 : opacity * vertexColorVSOutput.a * (1.0 - 0.8 * df);

    fragOutput0 = vec4(ambientColor * ambient + diffuseL * diffuse + specularL * specular, opacity);

    if (fragOutput0.a <= 0.0)
      {
      discard;
      }

    //VTK::DepthPeeling::Impl

    //VTK::Picking::Impl

    // handle coincident offsets
    //VTK::Coincident::Impl

    //VTK::ZBuffer::Impl
    
    float weight = fragOutput0.a * pow(max(1.1 - gl_FragCoord.z, 0.0), 2.0);
    fragOutput0 = vec4(fragOutput0.rgb*weight, fragOutput0.a);
    fragOutput1.r = weight;
  }`;