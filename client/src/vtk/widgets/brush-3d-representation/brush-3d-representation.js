import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkCubeSource from '@kitware/vtk.js/Filters/Sources/CubeSource';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkGlyph3DMapper from '@kitware/vtk.js/Rendering/Core/Glyph3DMapper';
import { ScalarMode } from '@kitware/vtk.js/Rendering/Core/Mapper/Constants';
import vtkContextRepresentation from '@kitware/vtk.js/Widgets/Representations/ContextRepresentation';
import vtkWidgetRepresentation from '@kitware/vtk.js/Widgets/Representations/WidgetRepresentation';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import macro from '@kitware/vtk.js/macros';

function vtkBrush3DRepresentation(publicAPI, model) {
  model.classHierarchy.push('vtkBrush3DRepresentation');

  model.internalPolyData = vtkPolyData.newInstance({ mtime: 0 });
  model.internalArrays = {
    points: model.internalPolyData.getPoints(),
    scale: vtkDataArray.newInstance({
      name: 'scale',
      numberOfComponents: 3,
      empty: true,
    }),
    color: vtkDataArray.newInstance({
      name: 'color',
      numberOfComponents: 1,
      empty: true,
    }),
  };
  model.internalPolyData.getPointData().addArray(model.internalArrays.scale);
  model.internalPolyData.getPointData().addArray(model.internalArrays.color);

  model.pipelines = {
    cube: {
      source: publicAPI,
      glyph: vtkCubeSource.newInstance({
        xLength: model.xLength,
        yLength: model.yLength,
        zLength: model.zLength
      }),
      mapper: vtkGlyph3DMapper.newInstance({
        scaleArray: 'scale',
        scaleMode: vtkGlyph3DMapper.ScaleModes.SCALE_BY_MAGNITUDE,
        colorByArrayName: 'color',
        scalarMode: ScalarMode.USE_POINT_FIELD_DATA,
        lookupTable: vtkColorTransferFunction.newInstance()
      }),
      actor: vtkActor.newInstance({ pickable: false, parentProp: publicAPI }),
    },
  };

  model.pipelines.cube.actor.getProperty().setOpacity(0.2);
  model.pipelines.cube.actor.getProperty().setEdgeVisibility(true);
  model.pipelines.cube.actor.getProperty().setOpacity(0.2);

  vtkWidgetRepresentation.connectPipeline(model.pipelines.cube);

  publicAPI.addActor(model.pipelines.cube.actor);
  publicAPI.setLengths = (x, y, z) => {
    model.pipelines.cube.glyph.setXLength(x);
    model.pipelines.cube.glyph.setYLength(y);
    model.pipelines.cube.glyph.setZLength(z);
  };
  publicAPI.setColor = (color) => {
    const lut = model.pipelines.cube.mapper.getLookupTable();
    
    lut.removeAllPoints();
    lut.addRGBPoint(0, ...color);
    lut.addRGBPoint(1, ...color);

    model.pipelines.cube.actor.getProperty().setEdgeColor(...color);
  };

  publicAPI.setColor([1, 1, 1]);

  publicAPI.setOpacity = (opacity) => {
    model.pipelines.cube.actor.getProperty().setOpacity(opacity);
  };
  const superGetRepresentationStates = publicAPI.getRepresentationStates;
  publicAPI.getRepresentationStates = (input = model.inputData[0]) =>
    superGetRepresentationStates(input).filter(
      (state) => state.getOrigin?.() && state.isVisible?.()
    );
  publicAPI.requestData = (inData, outData) => {
    const { points, scale, color } = model.internalArrays;
    const list = publicAPI.getRepresentationStates(inData[0]);
    const totalCount = list.length;

    if (color.getNumberOfValues() !== totalCount) {
      // Need to resize dataset
      points.setData(new Float32Array(3 * totalCount));
      scale.setData(new Float32Array(3 * totalCount));
      color.setData(new Float32Array(totalCount));
    }
    const typedArray = {
      points: points.getData(),
      scale: scale.getData(),
      color: color.getData(),
    };

    for (let i = 0; i < totalCount; i += 1) {
      const state = list[i];
      const isActive = state.getActive();
      const scaleFactor = isActive ? model.activeScaleFactor : 1;

      const coord = state.getOrigin();
      typedArray.points[i * 3 + 0] = coord[0];
      typedArray.points[i * 3 + 1] = coord[1];
      typedArray.points[i * 3 + 2] = coord[2];

      typedArray.scale[i] =
        scaleFactor *
        (state.getScale1 ? state.getScale1() : model.defaultScale);

      typedArray.color[i] =
        model.useActiveColor && isActive ? model.activeColor : state.getColor();
    }

    model.internalPolyData.modified();
    outData[0] = model.internalPolyData;
  };
}

const DEFAULT_VALUES = {
  xLength: 1,
  yLength: 1,
  zLength: 1,
  defaultScale: 1,
  drawBorder: false,
  drawFace: true,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);
  vtkContextRepresentation.extend(publicAPI, model, initialValues);
  macro.setGet(publicAPI, model, ['defaultScale']);
  macro.get(publicAPI, model, ['glyph', 'mapper', 'actor']);
  vtkBrush3DRepresentation(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkBrush3DRepresentation'
);

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };