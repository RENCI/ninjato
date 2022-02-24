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

  let sliceCalculator = null;
  let color = null;
  
  const mapper = vtkMapper.newInstance();
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper); 
  actor.getProperty().setInterpolationToFlat();

  if (type === 'region') {
    sliceCalculator = vtkCalculator.newInstance();
    sliceCalculator.setFormulaSimple(
      FieldDataTypes.CELL,
      ['Coordinates'],
      'slice',
      coordinate => coordinate[2]
    );
    sliceCalculator.setInputConnection(flyingEdges.getOutputPort());

    color = vtkColorTransferFunction.newInstance();

    mapper.setUseLookupTableScalarRange(true);
    mapper.setScalarModeToUseCellData();
    mapper.setLookupTable(color);
    mapper.setInputConnection(sliceCalculator.getOutputPort());
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
      const bounds = mapper.getInputData().getBounds();
      const spacing = flyingEdges.getInputData().getSpacing();
      const sliceMin = bounds[4] / spacing[2];

      // XXX: Hack to deal with edge case
      if (sliceMin - slice === -0.5) slice--;
      const s = 0;
      const e = 0.1;

      const [r1, g1, b1] = Reds[5];
      const [r2, g2, b2] = Reds[3];
  
      color.removeAllPoints();
      color.addRGBPoint(slice - s - e, r2, g2, b2);
      color.addRGBPoint(slice - s, r1, g1, b1);
      color.addRGBPoint(slice + s, r1, g1, b1);
      color.addRGBPoint(slice + s + e, r2, g2, b2);
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
      if (sliceCalculator) sliceCalculator.delete();
      if (color) color.delete();
    }
  };
}