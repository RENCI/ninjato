// Helper function for handling image scaling needed for SAM
export const handleImageScale = image => {
  // Input images to SAM must be resized so the longest side is 1024
  const LONG_SIDE_LENGTH = 1024;
  const dims = image.getDimensions();
  let w = dims[0];
  let h = dims[1];
  const samScale = LONG_SIDE_LENGTH / Math.max(w, h);
  return { height: h, width: w, samScale };
};

const getMax = a => {
  const len = a.length;
  let max = -Infinity;

  for (let i = 0; i < len; i++) {
    if (a[i] > max) max = a[i];
  }
  return max;
}

const getMin = a => {
  const len = a.length;
  let min = Infinity;

  for (let i = 0; i < len; i++) {
    if (a[i] < min) min = a[i];
  }
  return min;
}

// Threshold the mask prediction values
export const thresholdOnnxMask = (input, threshold) => {
  // Assuming threshold of 0.5, we can just use 0
  if (threshold === 0.5) {
    return input.map(v => v > 0);
  }
  
  const maxValue = getMax(input);
  const minValue = getMin(input);
  const extreme = Math.max(maxValue, Math.abs(minValue));
  const t = -extreme + threshold * 2 * extreme;

  console.log(maxValue, minValue, extreme, t);

  return input.map(v => v > t);
}
