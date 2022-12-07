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