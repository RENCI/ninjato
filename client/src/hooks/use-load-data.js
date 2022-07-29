import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserContext, SET_DATA,
  AnnotateContext, ANNOTATE_RESET,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR, ANNOTATE_SET_ACTIVE_REGION 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';
import { combineMasks } from 'utils/data';

export const useLoadData = ()  => {
  const [{ maskData }, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();
  const [, refineDispatch] = useContext(AnnotateContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async ({ imageId, maskId, regions, location }, assignmentToUpdate = null) => {
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

      if (!assignmentToUpdate) {
        userDispatch({
          type: SET_DATA,
          imageData: newImageData,
          maskData: newMaskData
        });
  
        refineDispatch({
          type: ANNOTATE_RESET
        });

        refineDispatch({
          type: ANNOTATE_SET_ACTIVE_REGION,
          region: regions.length > 0 ? regions[0] : null
        });

        navigate('/assignment');
      }
      else {
        userDispatch({
          type: SET_DATA,
          imageData: newImageData,
          maskData: combineMasks(newMaskData, location, maskData, assignmentToUpdate.location)
        });

        refineDispatch({
          type: ANNOTATE_SET_ACTIVE_REGION,
          region: regions.length > 0 ? regions[regions.length - 1] : null
        });
      }

      loadingDispatch({ type: CLEAR_LOADING });
    }
    catch (error) {
      console.log(error);

      loadingDispatch({ type: CLEAR_LOADING });

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};