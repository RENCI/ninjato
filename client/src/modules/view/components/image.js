import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';

const sliceMode = vtkImageMapper.SlicingMode.K;

export function Image() {
  const mapper = vtkImageMapper.newInstance();
  mapper.setSlicingMode(sliceMode);

  const actor = vtkImageSlice.newInstance();
  actor.getProperty().setInterpolationTypeToNearest();
  actor.setMapper(mapper);

  return {
    getActor: () => actor,
    getMapper: () => mapper,
    setInputData: data => {
      mapper.setInputData(data);
    },
    toggleInterpolation: () => {
      const type = actor.getProperty().getInterpolationType();
      actor.getProperty().setInterpolationType(type === 0 ? 1 : 0);
    },
    cleanUp: () => {
      console.log('Clean up image');

      // Clean up anything we instantiated
      actor.delete();
      mapper.delete();
    }
  }
}