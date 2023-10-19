import { Tensor } from "onnxruntime-web";

export const modelData = ({ clicks, tensor, modelScale }) => {
  const imageEmbedding = tensor;
  let pointCoords;
  let pointLabels;
  let pointCoordsTensor;
  let pointLabelsTensor;

  /*
  The ONNX model has a different input signature than SamPredictor.predict. The following inputs must all be supplied. Note the special cases for both point and mask inputs. All inputs are np.float32.

  image_embeddings: The image embedding from predictor.get_image_embedding(). Has a batch index of length 1.
  point_coords: Coordinates of sparse input prompts, corresponding to both point inputs and box inputs. Boxes are encoded using two points, one for the top-left corner and one for the bottom-right corner. Coordinates must already be transformed to long-side 1024. Has a batch index of length 1.
  point_labels: Labels for the sparse input prompts. 0 is a negative input point, 1 is a positive input point, 2 is a top-left box corner, 3 is a bottom-right box corner, and -1 is a padding point. If there is no box input, a single padding point with label -1 and coordinates (0.0, 0.0) should be concatenated.
  mask_input: A mask input to the model with shape 1x1x256x256. This must be supplied even if there is no mask input. In this case, it can just be zeros.
  has_mask_input: An indicator for the mask input. 1 indicates a mask input, 0 indicates no mask input.
  orig_im_size: The size of the input image in (H,W) format, before any transformation.
  Additionally, the ONNX model does not threshold the output mask logits. To obtain a binary mask, threshold at sam.mask_threshold (equal to 0.0).
  */

  if (clicks?.length > 0) {
    const n = clicks.length;

    const hasBox = clicks.filter(({ clickType }) => clickType === 2).length > 0 &&
      clicks.filter(({ clickType }) => clickType === 3).length > 0;

    const padding = hasBox ? 0 : 1;

    // If there is no box input, a single padding point with 
    // label -1 and coordinates (0.0, 0.0) should be concatenated
    // so initialize the array to support (n + 1) points.
    pointCoords = new Float32Array(2 * (n + padding));
    pointLabels = new Float32Array(n + padding);

    // Add clicks and scale to what SAM expects
    for (let i = 0; i < n; i++) {
      pointCoords[2 * i] = clicks[i].x * modelScale.samScale;
      pointCoords[2 * i + 1] = clicks[i].y * modelScale.samScale;
      pointLabels[i] = clicks[i].clickType;
    }

    // Add in the extra point/label when only clicks and no box
    // The extra point is at (0, 0) with label -1
    if (!hasBox) {
      pointCoords[2 * n] = 0.0;
      pointCoords[2 * n + 1] = 0.0; 
      pointLabels[n] = -1.0;
    }

    // Create the tensor
    pointCoordsTensor = new Tensor("float32", pointCoords, [1, n + padding, 2]);
    pointLabelsTensor = new Tensor("float32", pointLabels, [1, n + padding]);
  }

  const imageSizeTensor = new Tensor("float32", [
    modelScale.height,
    modelScale.width,
  ]);

  if (pointCoordsTensor === undefined || pointLabelsTensor === undefined)
    return;

  // There is no previous mask, so default to an empty tensor
  const maskInput = new Tensor(
    "float32",
    new Float32Array(256 * 256),
    [1, 1, 256, 256]
  );
  // There is no previous mask, so default to 0
  const hasMaskInput = new Tensor("float32", [0]);

  return {
    image_embeddings: imageEmbedding,
    point_coords: pointCoordsTensor,
    point_labels: pointLabelsTensor,
    orig_im_size: imageSizeTensor,
    mask_input: maskInput,
    has_mask_input: hasMaskInput,
  };
};