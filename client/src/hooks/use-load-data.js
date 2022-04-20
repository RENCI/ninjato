import { useContext } from 'react';
import { 
  DataContext, SET_DATA,
  RefineContext, REFINE_RESET,
  FlagContext, FLAG_RESET,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';

export const useLoadData = ()  => {
  const [, dataDispatch] = useContext(DataContext);
  const [, refineDispatch] = useContext(RefineContext);
  const [, flagDispatch] = useContext(FlagContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async ({ imageId, maskId, regions }) => {
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

      dataDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData,
        label: regions[0].label // XXX: Need to update this
      });

      refineDispatch({
        type: REFINE_RESET
      });

      flagDispatch({
        type: FLAG_RESET
      });

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