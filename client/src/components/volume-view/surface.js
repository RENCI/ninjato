import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

export function Surface() {
  const marchingCubes = vtkImageMarchingCubes.newInstance({
    contourValue: 1,
    computeNormals: true,
    mergePoints: true
  });

  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(marchingCubes.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.getProperty().setColor(1, 0, 0);
  //actor.getProperty().setInterpolationToFlat();
  actor.setMapper(mapper); 

  return {
    getActor: () => actor,
    setInputData: data => marchingCubes.setInputData(data),
    cleanUp: () => {
      actor.delete();
      mapper.delete();
      marchingCubes.delete();
    }
  };
}