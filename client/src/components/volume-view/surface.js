//import vtkCalculator from '@kitware/vtk.js/Filters/General/Calculator';
import vtkCalculator from 'vtk/calculator';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

export function Surface(formula, color) {
  const calculator = vtkCalculator.newInstance();
  
  calculator.setFormulaSimple(
    FieldDataTypes.POINT,
    ['scalars'],
    'mask',
    value => formula(value)
  );

  const marchingCubes = vtkImageMarchingCubes.newInstance({
    contourValue: 1,
    computeNormals: true,
    mergePoints: true
  });
  marchingCubes.setInputConnection(calculator.getOutputPort());

  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(marchingCubes.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.getProperty().setColor(color);
  //actor.getProperty().setInterpolationToFlat();
  actor.setMapper(mapper); 

  return {
    getActor: () => actor,
    setInputData: data => calculator.setInputData(data),
    setFormula: formula => calculator.setFormulaSimple(
      FieldDataTypes.POINT,
      ['scalars'],
      'mask',
      value => formula(value)
    ),
    cleanUp: () => {
      actor.delete();
      mapper.delete();
      marchingCubes.delete();
    }
  };
}