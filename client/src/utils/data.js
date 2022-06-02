export const getUniqueLabels = imageData => 
  [...new Set(imageData.getPointData().getScalars().getData().filter(d => d !== 0))].sort((a, b) => a - b);

export const combineMasks = (mask1, mask2) => {
  const ext1 = mask1.getExtent();
  const ext2 = mask2.getExtent();

  // Mask 2 should fit inside mask 1
  if (ext2[0] < ext1[0] || ext2[1] > ext1[1] || 
      ext2[2] < ext1[2] || ext2[3] > ext1[3] ||
      ext2[4] < ext1[4] || ext2[4] > ext1[5]) {
    throw new Error(`Extent mismatch: ${ ext1 }, ${ ext2 }`);
  }

  const offset = [ext2[0] - ext1[0], ext2[2] - ext1[2], ext2[4] - ext1[4]];

  const [x1, y1] = mask1.getDimensions();
  const [x2, y2, z2] = mask2.getDimensions();

  const jStride1 = x1;
  const kStride1 = x1 * y1;

  const jStride2 = x2;
  const kStride2 = x2 * y2;

  const s1 = mask1.getPointData().getScalars().getData();
  const s2 = mask2.getPointData().getScalars().getData();

  for (let i = 0; i < x2; i++) {
    for (let j = 0; j < y2; j++) {
      for (let k = 0; k < z2; k++) {
        const index1 = (i + offset[0]) + (j + offset[1]) * jStride1 + (k + offset[2]) * kStride1;
        const index2 = i + j * jStride2 + k * kStride2;

        s1[index1] = s2[index2];
      }
    }
  }

  return mask1;
};