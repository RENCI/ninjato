import { useContext } from 'react';
import { 
  DataContext, SET_DATA,
  RefineContext, REFINE_RESET,
  FlagContext, FLAG_RESET,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';

export const useLoadData = ()  => {
  const [, dataDispatch] = useContext(DataContext);
  const [, refineDispatch] = useContext(RefineContext);
  const [, flagDispatch] = useContext(FlagContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async ({ imageId, maskId, label }) => {
    try {
      const data = await api.getData(imageId, maskId);

      const imageData = decodeTIFF(data.imageBuffer);
      const maskData = decodeTIFF(data.maskBuffer);

      // Some sanity checking
      const iDims = imageData.getDimensions();
      const mDims = maskData.getDimensions();

      const same = iDims.reduce((same, dim, i) => same && dim === mDims[i], true);

      if (!same) {
        throw new Error(`Image dimensions (${ iDims }) do not match mask dimensions (${ mDims }).\nPlease contact the site administrator.`);
      }
      else if (Math.min(...iDims) <= 1) {
        throw new Error(`Returned volume dimensions are (${ iDims }).\nAll dimensions must be greater than 1.\nPlease contact the site administrator`);
      }

      dataDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData,
        label: label
      });

      refineDispatch({
        type: REFINE_RESET
      });

      flagDispatch({
        type: FLAG_RESET
      });
    }
    catch (error) {
      console.log(error);

      // XXX: Potentialy decline to get a new assignment?

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};