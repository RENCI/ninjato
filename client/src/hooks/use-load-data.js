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
import { combineMasks, getUniqueLabels } from 'utils/data';
import { backgroundColors } from 'utils/colors';

const getBackgroundRegions = async (subvolumeId, mask, regions) => {
  const allLabels = getUniqueLabels(mask);
  const labels = regions.map(({ label }) => label);
  const backgroundLabels = allLabels.filter(label => !labels.includes(label));

  const backgroundRegions = [];

  for (const label of backgroundLabels) {
    const info = await api.getRegionInfo(subvolumeId, label);

    console.log(info);
  }

  return backgroundRegions;
};

export const useLoadData = ()  => {
  const [{ maskData }, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();
  const [, refineDispatch] = useContext(AnnotateContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async ({ subvolumeId, imageId, maskId, regions, location }, assignmentToUpdate = null) => {
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
        console.log(subvolumeId);

        const backgroundRegions = await getBackgroundRegions(subvolumeId, newMaskData, regions);

        console.log(backgroundRegions);

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
        const combinedMasks = combineMasks(newMaskData, location, maskData, assignmentToUpdate.location);

        const backgroundRegions = getBackgroundRegions(subvolumeId, newMaskData, regions);

        userDispatch({
          type: SET_DATA,
          imageData: newImageData,
          maskData: combinedMasks
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