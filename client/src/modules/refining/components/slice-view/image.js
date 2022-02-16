import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Image() {
  let mapper = vtkImageMapper.newInstance();
  mapper.setSlicingMode(sliceMode);

  let actor = vtkImageSlice.newInstance();
  actor.getProperty().setInterpolationTypeToNearest();
  actor.setMapper(mapper);

  return {
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: data => {
      mapper.setInputData(data);
    },
    cleanUp: () => {
      console.log("Clean up image");

      // Clean up anything we instantiated
      actor.delete();
      mapper.delete();
    }
  }
}