import vtkOutlineFilter from '@kitware/vtk.js/Filters/General/OutlineFilter';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';

export function BoundingBox() {
  const outline = vtkOutlineFilter.newInstance();

  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(outline.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.getProperty().setRepresentationToWireframe();
  actor.getProperty().setLighting(false);
  actor.getProperty().setColor([0, 0, 0]);
  actor.getProperty().setOpacity(0.1);
  actor.setPickable(false);
  actor.setMapper(mapper);

  return {
    getActor: () => actor,
    setData: data => outline.setInputData(data),
    cleanUp: () => {
      console.log('Clean up bounding box');

      // Clean up anything we instantiated
      outline.delete();
      mapper.delete();
      actor.delete();
    }
  };
}