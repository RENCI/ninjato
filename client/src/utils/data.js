export const getUniqueLabels = imageData => 
  [...new Set(imageData.getPointData().getScalars().getData().filter(d => d !== 0))].sort((a, b) => a - b);