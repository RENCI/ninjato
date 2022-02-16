import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';
import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';

import vtkCalculator from 'vtk/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/discrete-marching-cubes';
import { Reds, Blues } from 'utils/colors';

const regionFormula = label => (v => v === label ? 1 : 0);
const backgroundFormula = label => (v => v !== label && v !== 0 ? 1 : 0);

export function Surface(type = 'background') {
  const maskCalculator = vtkCalculator.newInstance();

  const marchingCubes = vtkDiscreteFlyingEdges3D.newInstance({
    contourValue: 1,
    computeNormals: true,
    mergePoints: true
  });
  marchingCubes.setInputConnection(maskCalculator.getOutputPort());

  let zCalculator = null;
  let color = null;
  
  const mapper = vtkMapper.newInstance();
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 

  if (type === 'region') {
    zCalculator = vtkCalculator.newInstance();
    zCalculator.setFormula({
      getArrays: () => ({
        input: [
          { location: FieldDataTypes.COORDINATE }
        ],
        output: [
          {
            location: FieldDataTypes.POINT,
            name: 'z',
            dataType: 'Float32Array',
            attribute: AttributeTypes.SCALARS
          }
        ]}),
      evaluate: (arraysIn, arraysOut) => {
        const [coords] = arraysIn.map(d => d.getData());
        const [slice] = arraysOut.map(d => d.getData());
  
        const n = coords.length / 3;
        for (let i = 0; i < n; i++) {
          slice[i] = coords[i * 3 + 2];
        }
  
        arraysOut.forEach(array => array.modified());
      }
    });
    zCalculator.setInputConnection(marchingCubes.getOutputPort());

    color = vtkColorTransferFunction.newInstance();

    mapper.setUseLookupTableScalarRange(true);
    mapper.setLookupTable(color);
    mapper.setInputConnection(zCalculator.getOutputPort());

    actor.getProperty().setAmbient(0.2);
  }
  else {
    mapper.setInputConnection(marchingCubes.getOutputPort());

    actor.getProperty().setDiffuseColor(Blues[2]);
    actor.getProperty().setAmbientColor(Blues[8]);
    actor.getProperty().setAmbient(0.8);
    actor.getProperty().setOpacity(0.4);
    actor.getProperty().setBackfaceCulling(true);
  }

  return {
    getActor: () => actor,
    setInputData: data => maskCalculator.setInputData(data),
    setLabel: label => {
      const formula = type === 'region' ? regionFormula(label) : backgroundFormula(label)

      maskCalculator.setFormulaSimple(
        FieldDataTypes.POINT,
        ['scalars'],
        'mask',
        value => formula(value)
      )
    },
    setSlice: slice => {
      const z = maskCalculator.getInputData().indexToWorld([0, 0, slice])[2];

      const [r1, g1, b1] = Reds[5];
      const [r2, g2, b2] = Reds[3];
  
      color.removeAllPoints();
      color.addRGBPoint(0, r2, g2, b2);
      color.addRGBPoint(z - 0.1, r2, g2, b2);
      color.addRGBPoint(z, r1, g1, b1);
      color.addRGBPoint(z + 0.1, r2, g2, b2);
    },
    getOutput: () => {
      mapper.update();
      return mapper.getInputData();
    },
    cleanUp: () => {
      console.log("Clean up surface");

      // Clean up anything we instantiated
      maskCalculator.delete();
      marchingCubes.delete();
      mapper.delete();
      actor.delete();
      if (zCalculator) zCalculator.delete();
      if (color) color.delete();
    }
  };
}