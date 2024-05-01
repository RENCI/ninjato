import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

export const getUniqueLabels = maskData =>
  [...new Set(maskData.getPointData().getScalars().getData().filter(d => d !== 0))].sort((a, b) => a - b);

export const copyImage = image => {
  const copy = vtkImageData.newInstance({
    origin: image.getOrigin(),
    spacing: image.getSpacing(),
    extent: image.getExtent()
  });

  const pd = image.getPointData().getArrayByIndex(0);

  const data = vtkDataArray.newInstance({
    name: pd.getName(),
    numberOfComponents: pd.getNumberOfComponents(),
    values: [...pd.getData()]
  });

  copy.getPointData().setScalars(data);

  return copy;
};

export const cropImage = (image, extent) => {
  const currentExtent = image.getExtent();

  if (extent.x_min < currentExtent[0] ||
      extent.x_max > currentExtent[1] ||
      extent.y_min < currentExtent[2] ||
      extent.y_max > currentExtent[3] ||
      extent.z_min < currentExtent[4] ||
      extent.z_max > currentExtent[5] ) {
    console.warn('cropImage: New extent does not fit inside old extent');
    return image;
  }

  const crop = vtkImageData.newInstance({
    origin: [0, 0, 0],
    spacing: image.getSpacing(),
    extent: [extent.x_min, extent.x_max, extent.y_min, extent.y_max, extent.z_min, extent.z_max]
  });

  const [x1, y1] = image.getDimensions();
  const [x2, y2, z2] = crop.getDimensions();

  const offset = [extent.x_min, extent.y_min, extent.z_min];

  const values = new Float32Array(x2 * y2 * z2);

  const jStride1 = x1;
  const kStride1 = x1 * y1;

  const jStride2 = x2;
  const kStride2 = x2 * y2;
  
  const s = image.getPointData().getScalars().getData();

  for (let i = 0; i < x2; i++) {
    for (let j = 0; j < y2; j++) {
      for (let k = 0; k < z2; k++) {
        const index1 = (i + offset[0]) + (j + offset[1]) * jStride1 + (k + offset[2]) * kStride1;
        const index2 = i + j * jStride2 + k * kStride2;
        values[index2] = s[index1];
      }
    }
  }
  
  const pd = image.getPointData().getArrayByIndex(0);

  const data = vtkDataArray.newInstance({
    name: pd.getName(),
    numberOfComponents: pd.getNumberOfComponents(),
    values: values
  });

  crop.getPointData().setScalars(data);

  return crop;
};

export const combineMasks = (newMask, newExtent, oldMask, oldExtent) => {
  // Keep any edits from old mask
  
  const offset1 = [newExtent.x_min, newExtent.y_min, newExtent.z_min];
  const offset2 = [oldExtent.x_min, oldExtent.y_min, oldExtent.z_min];

  const [x1, y1] = newMask.getDimensions();
  const [x2, y2] = oldMask.getDimensions();

  const jStride1 = x1;
  const kStride1 = x1 * y1;

  const jStride2 = x2;
  const kStride2 = x2 * y2;

  const s1 = newMask.getPointData().getScalars().getData();
  const s2 = oldMask.getPointData().getScalars().getData();

  const copyExtent = [
    Math.max(newExtent.x_min, oldExtent.x_min), Math.min(newExtent.x_max, oldExtent.x_max),
    Math.max(newExtent.y_min, oldExtent.y_min), Math.min(newExtent.y_max, oldExtent.y_max),
    Math.max(newExtent.z_min, oldExtent.z_min), Math.min(newExtent.z_max, oldExtent.z_max)
  ];
  
  for (let i = copyExtent[0]; i <= copyExtent[1]; i++) {
    for (let j = copyExtent[2]; j <= copyExtent[3]; j++) {
      for (let k = copyExtent[4]; k <= copyExtent[5]; k++) {
        const index1 = (i - offset1[0]) + (j - offset1[1]) * jStride1 + (k - offset1[2]) * kStride1;
        const index2 = (i - offset2[0]) + (j - offset2[1]) * jStride2 + (k - offset2[2]) * kStride2;

        s1[index1] = s2[index2];
      }
    }
  }
  
  return newMask;
};

export const getMissingRegions = (maskData, regions) => {
  const allLabels = getUniqueLabels(maskData);

  return regions.reduce((missing, region) => {
    if (!allLabels.includes(region.label)) missing.push(region);
    return missing;
  }, []);
};

const checkDimensions = (image1, image2) => {
  const d1 = image1.getDimensions();
  const d2 = image2.getDimensions();

  if (d1[0] !== d2[0] || d1[1] !== d2[1] || d1[2] !== d2[2]) {
    console.warn(`Images have different dimensions: [${ d1 }], [${ d2 }]`);
    return false;
  }
  else {
    return true;
  }
};

export const computeDiceScore = (image1, image2) => {  
  if (!checkDimensions(image1, image2)) return null;

  const s1 = image1.getPointData().getScalars().getData();
  const s2 = image2.getPointData().getScalars().getData();

  const binary = v => Math.min(v, 1);
  const ix = s1.reduce((ix, v, i) => ix + binary(v) * binary(s2[i]), 0);

  const count = a => a.reduce((count, v) => count + binary(v), 0);

  return 2 * ix / (count(s1) + count(s2)); 
};

export const computeMultilabelSimilarity = (image1, image2) => {
  if (!checkDimensions(image1, image2)) return null;

  const s1 = image1.getPointData().getScalars().getData();
  const s2 = image2.getPointData().getScalars().getData();

  // Get unique labels for each image
  const labels1 = getUniqueLabels(image1);
  const labels2 = getUniqueLabels(image2);

  // Initialize 
  const scoreMatrix = labels1.map(() => labels2.map(() => 0));

  // Fill in score matrix for each label pair
  labels1.forEach((label1, i) => {
    const bw1 = s1.map(v => v === label1);

    labels2.forEach((label2, j) => {
      const bw2 = s2.map(v => v === label2);

      const ix = bw1.reduce((ix, v1, i) => ix + (v1 && bw2[i] ? 1 : 0), 0);

      scoreMatrix[i][j] = ix;
    });
  });

  // Initialize scores for each label in image1
  const scores = labels1.map(() => 0);

  // Greedy algorithm to pick best scores
  labels1.forEach(() => {
    let maxValue = 0;
    let maxi = 0;
    let maxj = 0;

    scoreMatrix.forEach((row, i) => {
      row.forEach((score, j) => {
        if (score > maxValue) {
            maxValue = score;
            maxi = i;
            maxj = j;
        }
      });
    });

    if (maxValue > 0) {
      scores[maxi] = scoreMatrix[maxi][maxj];

      labels1.forEach((_, i) => scoreMatrix[i][maxj] = 0);
      labels2.forEach((_, j) => scoreMatrix[maxi][j] = 0);
    }
  });

  const sizeScores = scores.reduce((sum, v) => sum + v, 0);
  const size1 = s1.reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0);
  const size2 = s2.reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0);

  return 2 * sizeScores / (size1 + size2);
}