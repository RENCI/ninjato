import macro from '@kitware/vtk.js/macros';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkPlaneSource from '@kitware/vtk.js/Filters/Sources/PlaneSource';
import vtkContextRepresentation from '@kitware/vtk.js/Widgets/Representations/ContextRepresentation';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkGlyph3DMapper from '@kitware/vtk.js/Rendering/Core/Glyph3DMapper';
import vtkMatrixBuilder from '@kitware/vtk.js/Common/Core/MatrixBuilder';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkWidgetRepresentation from '@kitware/vtk.js/Widgets/Representations/WidgetRepresentation';

import { ScalarMode } from '@kitware/vtk.js/Rendering/Core/Mapper/Constants';

// ----------------------------------------------------------------------------
// vtkBrushRepresentation methods
// ----------------------------------------------------------------------------

function vtkBrushRepresentation(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkBrushRepresentation');

  // --------------------------------------------------------------------------
  // Internal polydata dataset
  // --------------------------------------------------------------------------

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
    direction: vtkDataArray.newInstance({
      name: 'direction',
      numberOfComponents: 9,
      empty: true,
    }),
  };
  model.internalPolyData.getPointData().addArray(model.internalArrays.scale);
  model.internalPolyData.getPointData().addArray(model.internalArrays.color);
  model.internalPolyData
    .getPointData()
    .addArray(model.internalArrays.direction);

  // --------------------------------------------------------------------------
  // Generic rendering pipeline
  // --------------------------------------------------------------------------

  model.pipelines = {
    brush: {
      source: publicAPI,
      glyph: vtkPlaneSource.newInstance({
        xResolution: 1,
        yResolution: 1,
        origin: [-0.5, -0.5, 0],
        point1: [0.5, -0.5, 0],
        point2: [-0.5, 0.5, 0]
      }),
      mapper: vtkGlyph3DMapper.newInstance({
        orientationArray: 'direction',
        scaleArray: 'scale',
        scaleMode: vtkGlyph3DMapper.ScaleModes.SCALE_BY_COMPONENTS,
        colorByArrayName: 'color',
        scalarMode: ScalarMode.USE_POINT_FIELD_DATA,
      }),
      actor: vtkActor.newInstance({ pickable: false, parentProp: publicAPI }),
    },
  };

  model.pipelines.brush.mapper.setOrientationModeToMatrix();
  model.pipelines.brush.mapper.setResolveCoincidentTopology(true);
  model.pipelines.brush.mapper.setResolveCoincidentTopologyPolygonOffsetParameters(
    -1,
    -1
  );

  vtkWidgetRepresentation.connectPipeline(model.pipelines.brush);

  publicAPI.addActor(model.pipelines.brush.actor);

  model.transform = vtkMatrixBuilder.buildFromDegree();

  /*
  // --------------------------------------------------------------------------

  publicAPI.setGlyphResolution = macro.chain(
    publicAPI.setGlyphResolution,
    (r) => model.pipelines.brush.glyph.setResolution(r)
  );

  // --------------------------------------------------------------------------

  publicAPI.setDrawBorder = (draw) => {
    model.pipelines.brush.glyph.setLines(draw);
  };

  // --------------------------------------------------------------------------

  publicAPI.setDrawFace = (draw) => {
    model.pipelines.brush.glyph.setFace(draw);
  };
  */

  // --------------------------------------------------------------------------

  publicAPI.setOpacity = (opacity) => {
    model.pipelines.brush.actor.getProperty().setOpacity(opacity);
  };

  // --------------------------------------------------------------------------

  publicAPI.requestData = (inData, outData) => {
    const { points, scale, color, direction } = model.internalArrays;
    const list = publicAPI
      .getRepresentationStates(inData[0])
      .filter(
        (state) =>
          state.getOrigin &&
          state.getOrigin() &&
          state.isVisible &&
          state.isVisible()
      );
    const totalCount = list.length;

    if (color.getNumberOfValues() !== totalCount) {
      // Need to resize dataset
      points.setData(new Float32Array(3 * totalCount));
      scale.setData(new Float32Array(3 * totalCount));
      direction.setData(new Float32Array(9 * totalCount));
      color.setData(new Float32Array(totalCount));
    }
    const typedArray = {
      points: points.getData(),
      scale: scale.getData(),
      color: color.getData(),
      direction: direction.getData(),
    };

    for (let i = 0; i < totalCount; i++) {
      const state = list[i];
      const isActive = state.getActive();
      const scaleFactor = isActive ? model.activeScaleFactor : 1;

      const coord = state.getOrigin();
      typedArray.points[i * 3 + 0] = coord[0];
      typedArray.points[i * 3 + 1] = coord[1];
      typedArray.points[i * 3 + 2] = coord[2];

      const right = state.getRight ? state.getRight() : [1, 0, 0];
      const up = state.getUp ? state.getUp() : [0, 1, 0];
      const dir = state.getDirection ? state.getDirection() : [0, 0, 1];
      const rotation = [...right, ...up, ...dir];

      let scale3 = state.getScale3 ? state.getScale3() : [1, 1, 1];
      scale3 = scale3.map((x) => (x === 0 ? 2 * model.defaultScale : 2 * x));

      for (let j = 0; j < 9; j += 1) {
        typedArray.direction[i * 9 + j] = rotation[j];
      }

      const scale1 =
        (state.getScale1 ? state.getScale1() : model.defaultScale) / 2;

      typedArray.scale[i * 3 + 0] = scale1 * scaleFactor * scale3[0];
      typedArray.scale[i * 3 + 1] = scale1 * scaleFactor * scale3[1];
      typedArray.scale[i * 3 + 2] = scale1 * scaleFactor * scale3[2];

      typedArray.color[i] =
        model.useActiveColor && isActive ? model.activeColor : state.getColor();
    }

    model.internalPolyData.modified();
    outData[0] = model.internalPolyData;
  };

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  glyphResolution: 32,
  defaultScale: 1,
  drawBorder: false,
  drawFace: true,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  vtkContextRepresentation.extend(publicAPI, model, initialValues);
  macro.setGet(publicAPI, model, ['glyphResolution', 'defaultScale']);
  macro.get(publicAPI, model, ['glyph', 'mapper', 'actor']);

  // Object specific methods
  vtkBrushRepresentation(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkBrushRepresentation'
);

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
