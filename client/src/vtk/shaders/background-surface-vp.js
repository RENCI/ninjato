// Vertex shader based on vtkPolyDataVS.glsl

export const BackgroundSurfaceVP =
  `//VTK::System::Dec
  attribute vec4 vertexMC;

  // frag position in VC
  out vec4 vertexVCVSOutput;
  uniform float pointSize;
  
  // optional normal declaration
  //VTK::Normal::Dec
  
  // extra lighting parameters
  //VTK::Light::Dec
  
  // Texture coordinates
  //VTK::TCoord::Dec
  
  // material property values
  attribute vec4 scalarColor;
  out vec4 vertexColorVSOutput;
  
  // clipping plane vars
  //VTK::Clip::Dec
  
  // camera and actor matrix values
  uniform mat4 MCPCMatrix;
  uniform mat4 MCVCMatrix;
  
  // Apple Bug
  //VTK::PrimID::Dec
  
  // picking support
  //VTK::Picking::Dec
  
  void main()
  {
    vertexColorVSOutput = scalarColor;
  
    //VTK::Normal::Impl
  
    //VTK::TCoord::Impl
  
    //VTK::Clip::Impl
  
    //VTK::PrimID::Impl
  
    vertexVCVSOutput = MCVCMatrix * vertexMC;
    gl_Position = MCPCMatrix * vertexMC;
    gl_PointSize = pointSize;
  
    //VTK::Light::Impl
  
    //VTK::Picking::Impl
  }`;