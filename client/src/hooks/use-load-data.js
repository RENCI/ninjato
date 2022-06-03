import { useContext } from 'react';
import { 
  UserContext, SET_DATA,
  RefineContext, REFINE_RESET,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR, REFINE_SET_ACTIVE_LABEL 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';
import { combineMasks } from 'utils/data';

export const useLoadData = ()  => {
  const [{ maskData }, userDispatch] = useContext(UserContext);
  const [, refineDispatch] = useContext(RefineContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async ({ imageId, maskId, regions, location }, assignmentToUpate = null) => {
    try {
      loadingDispatch({ type: SET_LOADING });

      const data = await api.getData(imageId, maskId);

      const newImageData = decodeTIFF(data.imageBuffer);
      const newMaskData = decodeTIFF(data.maskBuffer);

      // Some sanity checking
      const iDims = newImageData.getDimensions();
      const mDims = newMaskData.getDimensions();

      const same = iDims.reduce((same, dim, i) => same && dim === mDims[i], true);

      if (!same) {
        throw new Error(`Image dimensions (${ iDims }) do not match mask dimensions (${ mDims }).\nPlease contact the site administrator.`);
      }
      else if (Math.min(...iDims) <= 1) {
        throw new Error(`Returned volume dimensions are (${ iDims }).\nAll dimensions must be greater than 1.\nPlease contact the site administrator`);
      }

      if (!assignmentToUpate) {
        userDispatch({
          type: SET_DATA,
          imageData: newImageData,
          maskData: newMaskData
        });
  
        refineDispatch({
          type: REFINE_RESET
        });

        refineDispatch({
          type: REFINE_SET_ACTIVE_LABEL,
          label: regions.length > 0 ? regions[0].label : null
        });
      }
      else {
        userDispatch({
          type: SET_DATA,
          imageData: newImageData,
          maskData: combineMasks(newMaskData, location, maskData, assignmentToUpate.location)
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