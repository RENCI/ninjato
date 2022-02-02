import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkOutlineFilter from '@kitware/vtk.js/Filters/General/OutlineFilter';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';


export function Outline() {
  const outline = vtkOutlineFilter.newInstance();

  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(outline.getOutputPort());
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);

  return {
    setInput: input => outline.setInputConnection(input.getOutputPort()),
    getActor: () => actor
  };
}