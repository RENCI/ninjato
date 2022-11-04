export const printShaders = mapper => {
    // Print shader source
    const properties = mapper.getViewSpecificProperties();
    const print = {
      callback: (userData, cellBO) => {
        console.log(cellBO.getProgram().getVertexShader().getSource());
        console.log(cellBO.getProgram().getFragmentShader().getSource());
      }
    }
  
    if (properties.ShadersCallbacks) properties.ShadersCallbacks.push(print);
    else properties.ShadersCallbacks = [print];
  };