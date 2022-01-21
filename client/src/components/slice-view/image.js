import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Image() {
  let mapper = vtkImageMapper.newInstance();
  mapper.setSlicingMode(sliceMode);

  let actor = vtkImageSlice.newInstance();
  actor.setMapper(mapper);

  return {
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: data => {
      mapper.setInputData(data);

      const extent = data.getExtent();          
      mapper.setSlice((extent[5] - extent[4]) / 2);
    },
    cleanUp: () => {
      actor.delete();
      mapper.delete();
    }
  }
}