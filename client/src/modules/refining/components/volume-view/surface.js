import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';
import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';

import vtkCalculator from 'vtk/calculator';
import vtkDiscreteFlyingEdges3D from 'vtk/discrete-flying-edges-3D';
import { Reds, Blues } from 'utils/colors';

const regionFormula = label => (v => v === label ? 1 : 0);
const backgroundFormula = label => (v => v !== label && v !== 0 ? 1 : 0);

export function Surface(type = 'background') {
  const maskCalculator = vtkCalculator.newInstance();

  const flyingEdges = vtkDiscreteFlyingEdges3D.newInstance({
    values: [1],
    computeNormals: true,
    computeCoordinates: true
  });
  flyingEdges.setInputConnection(maskCalculator.getOutputPort());

  let zCalculator = null;
  let color = null;
  
  const mapper = vtkMapper.newInstance();
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 
  actor.getProperty().setInterpolationToFlat();

  if (type === 'region') {
    zCalculator = vtkCalculator.newInstance();
    /*
    zCalculator.setFormulaSimple(
      FieldDataTypes.CELL,
      ['Coordinates'],
      'slice',
      coordinate => coordinate[2]
    )
    */
    zCalculator.setFormula({
      getArrays: () => ({
        input: [
          { 
            location: FieldDataTypes.CELL,
            name: 'Coordinates',
            attribute: AttributeTypes.VECTORS
          }
        ],
        output: [
          {
            location: FieldDataTypes.CELL,
            name: 'slice',
            dataType: 'Float32Array',
            attribute: AttributeTypes.SCALARS
          }
        ]}),
      evaluate: (arraysIn, arraysOut) => {
        console.log(arraysIn);
        console.log(arraysOut);
        
        const [coords] = arraysIn.map(d => d.getData());
        const [slice] = arraysOut.map(d => d.getData());
  
        console.log(coords);

        const n = coords.length / 3;
        for (let i = 0; i < n; i++) {
          slice[i] = coords[i * 3 + 2];
        }
  
        arraysOut.forEach(array => array.modified());
      }

    });
    zCalculator.setInputConnection(flyingEdges.getOutputPort());

    color = vtkColorTransferFunction.newInstance();

    mapper.setUseLookupTableScalarRange(true);
    mapper.setScalarModeToUseCellData();
    mapper.setLookupTable(color);
    mapper.setInputConnection(zCalculator.getOutputPort());
  }
  else {
    mapper.setInputConnection(flyingEdges.getOutputPort());
    mapper.setScalarVisibility(false);

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
      const e = 0.1;

      const [r1, g1, b1] = Reds[5];
      const [r2, g2, b2] = Reds[3];
  
      color.removeAllPoints();
      color.addRGBPoint(slice - e, r2, g2, b2);
      color.addRGBPoint(slice, r1, g1, b1);
      color.addRGBPoint(slice + e, r2, g2, b2);
    },
    getOutput: () => {
      mapper.update();
      return mapper.getInputData();
    },
    cleanUp: () => {
      console.log("Clean up surface");

      // Clean up anything we instantiated
      maskCalculator.delete();
      flyingEdges.delete();
      mapper.delete();
      actor.delete();
      if (zCalculator) zCalculator.delete();
      if (color) color.delete();
    }
  };
}