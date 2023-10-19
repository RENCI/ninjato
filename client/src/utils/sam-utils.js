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