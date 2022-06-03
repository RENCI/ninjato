export const getUniqueLabels = imageData => 
  [...new Set(imageData.getPointData().getScalars().getData().filter(d => d !== 0))].sort((a, b) => a - b);

export const combineMasks = (mask1, extent1, mask2, extent2) => {
  console.log(extent1, extent2);

  console.log(mask1);

  // Mask 2 should fit inside mask 1
  if (extent2.x_min < extent1.x_min || extent2[1] > extent1[1] || 
      extent2.y_min < extent1.y_min || extent2[3] > extent1[3] ||
      extent2.z_min < extent1.z_min || extent2.z_min > extent1[5]) {
    throw new Error(`Extent mismatch: ${ extent1 }, ${ extent2 }`);
  }

  console.log(extent1, extent2);

  const offset = [extent2.x_min - extent1.x_min, extent2.y_min - extent1.y_min, extent2.z_min - extent1.z_min];

  console.log(offset);

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