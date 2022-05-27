import { useContext } from 'react';
import { 
  UserContext, SET_DATA,
  RefineContext, REFINE_RESET,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR, REFINE_SET_ACTIVE_LABEL 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';

export const useLoadData = ()  => {
  const [, userDispatch] = useContext(UserContext);
  const [, refineDispatch] = useContext(RefineContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async ({ imageId, maskId, regions }, reset = true) => {
    try {
      loadingDispatch({ type: SET_LOADING });

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

      userDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData
      });

      if (reset) {
        refineDispatch({
          type: REFINE_RESET
        });

        refineDispatch({
          type: REFINE_SET_ACTIVE_LABEL,
          label: regions.length > 0 ? regions[0].label : null
        });
      }

      loadingDispatch({ type: CLEAR_LOADING });
    }
    catch (error) {
      console.log(error);

      // XXX: Potentialy decline to get a new assignment?

      loadingDispatch({ type: CLEAR_LOADING });

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};