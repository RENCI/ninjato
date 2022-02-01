import vtkCubeSource from '@kitware/vtk.js/Filters/Sources/CubeSource';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

export function BoundingBox() {
  const cubeSource = vtkCubeSource.newInstance();

  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(cubeSource.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.getProperty().setRepresentationToWireframe();
  actor.getProperty().setLighting(false);
  actor.getProperty().setColor([0, 0, 0]);
  actor.getProperty().setOpacity(0.1);
  actor.setMapper(mapper);

  return {
    getActor: () => actor,
    setData: (data, aspectRatio = 1) => {
      const bb = data.getBounds();

      const size = [bb[1] - bb[0], bb[3] - bb[2], bb[5] - bb[4]];
      size[2] *= aspectRatio;        

      actor.setScale(size);
      actor.setPosition([size[0] / 2, size[1] / 2, size[2] / 2]);
    },
    cleanUp: () => {
      actor.delete();
      mapper.delete();
      cubeSource.delete();
    }
  };
}