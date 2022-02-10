import { vec3 } from 'gl-matrix';
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./ninjato-painter.worker.js";
import WebworkerPromise from 'webworker-promise';

import macro from '@kitware/vtk.js/macros';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

const { vtkErrorMacro } = macro;

// ----------------------------------------------------------------------------
// vtkNinjatoPainter methods
// ----------------------------------------------------------------------------

function vtkNinjatoPainter(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkNinjatoPainter');

  let worker = null;
  let workerPromise = null;
  let initialData = null;
  const history = {};

  // --------------------------------------------------------------------------

  function resetHistory() {
    history.index = -1;
    history.snapshots = [];
    history.labels = [];
  }

  function pushToHistory(snapshot, label) {
    // Clear any "redo" info
    const spliceIndex = history.index + 1;
    const spliceLength = history.snapshots.length - history.index;
    history.snapshots.splice(spliceIndex, spliceLength);
    history.labels.splice(spliceIndex, spliceLength);

    // Push new snapshot
    history.snapshots.push(snapshot);
    history.labels.push(label);
    history.index++;
  }

  // --------------------------------------------------------------------------

  publicAPI.startStroke = () => {
    if (model.labelMap) {
      if (!workerPromise) {
        worker = new Worker();
        workerPromise = new WebworkerPromise(worker);
      }

      workerPromise.exec('start', {
        bufferType: 'Uint16Array',
        dimensions: model.labelMap.getDimensions(),
        slicingMode: model.slicingMode,
      });
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.endStroke = (erase = false) => {
    let endStrokePromise;

    if (workerPromise) {
      endStrokePromise = workerPromise.exec('end');

      endStrokePromise.then((strokeBuffer) => {
        publicAPI.applyBinaryMask(strokeBuffer, erase);
        worker.terminate();
        worker = null;
        workerPromise = null;
      });
    }
    return endStrokePromise;
  };

  publicAPI.applyBinaryMask = (maskBuffer, erase = false) => {
    const scalars = model.labelMap.getPointData().getScalars();
    const data = scalars.getData();
    const maskLabelMap = new Uint16Array(maskBuffer);

    let diffCount = 0;
    for (let i = 0; i < maskLabelMap.length; i++) {
      // maskLabelMap is a binary mask
      diffCount += maskLabelMap[i];
    }

    // Format: [ [index, oldLabel], ...]
    // I could use an ArrayBuffer, which would place limits
    // on the values of index/old, but will be more efficient.
    const snapshot = new Array(diffCount);
    const label = model.label;

    let diffIdx = 0;
    if (erase) {
      if (model.voxelFunc) {
        const bgScalars = model.backgroundImage.getPointData().getScalars();
        for (let i = 0; i < maskLabelMap.length; i++) {
          if (maskLabelMap[i]) {
            const voxel = bgScalars.getTuple(i);
            // might not fill up snapshot
            if (!model.voxelFunc(voxel, i, label)) {
              snapshot[diffIdx++] = [i, data[i]];
              data[i] = initialData[i] === label ? 0 : initialData[i];
            }
          }
        }
      } else {
        for (let i = 0; i < maskLabelMap.length; i++) {
          if (maskLabelMap[i]) {
            if (data[i] === label) {
              snapshot[diffIdx++] = [i, data[i]];
              data[i] = initialData[i] === label ? 0 : initialData[i];
            }
          }
        }
      }
    }
    else {
      if (model.voxelFunc) {
        const bgScalars = model.backgroundImage.getPointData().getScalars();
        for (let i = 0; i < maskLabelMap.length; i++) {
          if (maskLabelMap[i]) {
            const voxel = bgScalars.getTuple(i);
            // might not fill up snapshot
            if (model.voxelFunc(voxel, i, label)) {
              snapshot[diffIdx++] = [i, data[i]];
              data[i] = label;
            }
          }
        }
      } 
      else {
        for (let i = 0; i < maskLabelMap.length; i++) {
          if (maskLabelMap[i]) {
            if (data[i] !== label) {
              snapshot[diffIdx++] = [i, data[i]];
              data[i] = label;
            }
          }
        }
      }
    }
    pushToHistory(snapshot, label);

    scalars.setData(data);
    scalars.modified();
    model.labelMap.modified();
    publicAPI.modified();
  };

  // --------------------------------------------------------------------------

  publicAPI.canUndo = () => history.index > -1;

  // --------------------------------------------------------------------------

  publicAPI.paintFloodFill = (pointList, brush) => {
    if (workerPromise && pointList.length > 0) {
      const points = [];
      for (let i = 0; i < pointList.length / 3; i++) {
        const worldPt = [
          pointList[3 * i + 0],
          pointList[3 * i + 1],
          pointList[3 * i + 2]
        ];
        const indexPt = [0, 0, 0];
        vec3.transformMat4(indexPt, worldPt, model.maskWorldToIndex);
        indexPt[0] = Math.round(indexPt[0]);
        indexPt[1] = Math.round(indexPt[1]);
        indexPt[2] = Math.round(indexPt[2]);

        points.push(indexPt);
      }

      workerPromise.exec('paintFloodFill', { 
        labels: model.labelMap.getPointData().getScalars().getData(),
        label: model.label,
        pointList: points, 
        brush
      });
    }
  };
  
  publicAPI.erase = (pointList, brush) => {
    if (workerPromise && pointList.length > 0) {
      const points = [];
      for (let i = 0; i < pointList.length / 3; i++) {
        const worldPt = [
          pointList[3 * i + 0],
          pointList[3 * i + 1],
          pointList[3 * i + 2]
        ];
        const indexPt = [0, 0, 0];
        vec3.transformMat4(indexPt, worldPt, model.maskWorldToIndex);
        indexPt[0] = Math.round(indexPt[0]);
        indexPt[1] = Math.round(indexPt[1]);
        indexPt[2] = Math.round(indexPt[2]);

        points.push(indexPt);
      }

      workerPromise.exec('erase', {
        pointList: points, 
        brush 
      });
    }
  };

  // --------------------------------------------------------------------------

  publicAPI.applyLabelMap = (labelMap) => {
    const currentMapData = model.labelMap.getPointData().getScalars().getData();

    const newMapData = labelMap.getPointData().getScalars().getData();

    // Compute snapshot
    const snapshot = [];
    for (let i = 0; i < newMapData.length; ++i) {
      if (currentMapData[i] !== newMapData[i]) {
        snapshot.push([i, currentMapData[i]]);
      }
    }

    pushToHistory(snapshot, model.label);
    model.labelMap = labelMap;
    publicAPI.modified();
  };

  // --------------------------------------------------------------------------

  publicAPI.undo = () => {
    if (history.index > -1) {
      const scalars = model.labelMap.getPointData().getScalars();
      const data = scalars.getData();

      const snapshot = history.snapshots[history.index];
      for (let i = 0; i < snapshot.length; i++) {
        if (!snapshot[i]) {
          break;
        }

        const [index, oldLabel] = snapshot[i];
        data[index] = oldLabel;
      }

      history.index--;

      scalars.setData(data);
      scalars.modified();
      model.labelMap.modified();
      publicAPI.modified();
    }
  };

  publicAPI.setBackgroundImage = (image) => {
    model.backgroundImage = image;

    initialData = new Uint16Array(image.getPointData().getScalars().getData());
  };

  // --------------------------------------------------------------------------

  publicAPI.canRedo = () => history.index < history.labels.length - 1;

  // --------------------------------------------------------------------------

  publicAPI.redo = () => {
    if (history.index < history.labels.length - 1) {
      const scalars = model.labelMap.getPointData().getScalars();
      const data = scalars.getData();

      const redoLabel = history.labels[history.index + 1];
      const snapshot = history.snapshots[history.index + 1];

      for (let i = 0; i < snapshot.length; i++) {
        if (!snapshot[i]) {
          break;
        }

        const [index] = snapshot[i];
        data[index] = redoLabel;
      }

      history.index++;

      scalars.setData(data);
      scalars.modified();
      model.labelMap.modified();
      publicAPI.modified();
    }
  };

  // --------------------------------------------------------------------------

  const superSetLabelMap = publicAPI.setLabelMap;
  publicAPI.setLabelMap = (lm) => {
    if (superSetLabelMap(lm)) {
      model.maskWorldToIndex = model.labelMap.getWorldToIndex();
      resetHistory();
      return true;
    }
    return false;
  };

  // --------------------------------------------------------------------------

  publicAPI.requestData = (inData, outData) => {
    if (!model.backgroundImage) {
      vtkErrorMacro('No background image');
      return;
    }

    if (!model.backgroundImage.getPointData().getScalars()) {
      vtkErrorMacro('Background image has no scalars');
      return;
    }

    if (!model.labelMap) {
      // clone background image properties
      const labelMap = vtkImageData.newInstance(
        model.backgroundImage.get('spacing', 'origin', 'direction')
      );
      labelMap.setDimensions(model.backgroundImage.getDimensions());
      labelMap.computeTransforms();

      // right now only support 256 labels
      const values = new Uint16Array(model.backgroundImage.getNumberOfPoints());
      const dataArray = vtkDataArray.newInstance({
        numberOfComponents: 1, // labelmap with single component
        values,
      });
      labelMap.getPointData().setScalars(dataArray);

      publicAPI.setLabelMap(labelMap);
    }

    if (!model.maskWorldToIndex) {
      model.maskWorldToIndex = model.labelMap.getWorldToIndex();
    }

    const scalars = model.labelMap.getPointData().getScalars();

    if (!scalars) {
      vtkErrorMacro('Mask image has no scalars');
      return;
    }

    model.labelMap.modified();

    outData[0] = model.labelMap;
  };

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  resetHistory();
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  backgroundImage: null,
  labelMap: null,
  maskWorldToIndex: null,
  voxelFunc: null,
  radius: 1,
  label: 0,
  slicingMode: null,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Make this a VTK object
  macro.obj(publicAPI, model);

  // Also make it an algorithm with no input and one output
  macro.algo(publicAPI, model, 0, 1);

  macro.setGet(publicAPI, model, [
    'labelMap',
    'maskWorldToIndex',
    'voxelFunc',
    'label',
    'radius',
    'slicingMode',
  ]);

  // Object specific methods
  vtkNinjatoPainter(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkNinjatoPainter');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
