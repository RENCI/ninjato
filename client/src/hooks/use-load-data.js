import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserContext, SET_DATA, SET_BACKGROUND_REGIONS, SET_ACTIVE_REGION,
  AnnotateContext, ANNOTATE_RESET,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';
import { combineMasks, getUniqueLabels } from 'utils/data';

const getBackgroundRegions = async (subvolumeId, mask, regions) => {
  const allLabels = getUniqueLabels(mask).filter(label => label !== 0);
  const labels = regions.map(({ label }) => label);
  const backgroundLabels = allLabels.filter(label => !labels.includes(label));

  const backgroundRegions = [];

  for (const label of backgroundLabels) {
    const info = await api.getRegionInfo(subvolumeId, label);

    backgroundRegions.push({
      label: label,
      info: info
    });
  }

  return backgroundRegions;
};

export const useLoadData = ()  => {
  const [{ maskData }, userDispatch] = useContext(UserContext);
  const [, annotateDispatch] = useContext(AnnotateContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const navigate = useNavigate();

  return async (assignment, assignmentToUpdate = null, mergeMasks = false) => {
    try {
      const { subvolumeId, } = assignment;
      const regions = assignmentToUpdate ? assignmentToUpdate.regions : assignment.regions;

      loadingDispatch({ type: SET_LOADING });

      const data = await api.getData(assignment);

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

      const backgroundRegions = await getBackgroundRegions(subvolumeId, newMaskData, regions);

      // XXX: combine masks needs to return a new vtkimage, currently changing new mask in place
      
      userDispatch({
        type: SET_DATA,
        imageData: newImageData,
        maskData: mergeMasks ? combineMasks(newMaskData, assignment.location, maskData, assignmentToUpdate.location) : newMaskData,
        backgroundMaskData: newMaskData
      });

      userDispatch({ 
        type: SET_BACKGROUND_REGIONS,
        regions: backgroundRegions
      });

      if (!assignmentToUpdate) {
        annotateDispatch({
          type: ANNOTATE_RESET
        });
      }

      userDispatch({
        type: SET_ACTIVE_REGION,
        region: regions.length > 0 ? 
          assignmentToUpdate ? regions[regions.length - 1] : 
          regions[0] : 
          null
      });

      navigate('/assignment');

      loadingDispatch({ type: CLEAR_LOADING });
    }
    catch (error) {
      console.log(error);

      loadingDispatch({ type: CLEAR_LOADING });

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};