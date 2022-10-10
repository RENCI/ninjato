import { useContext } from 'react';
import { 
  UserContext, SET_COMMENTS,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { createByteStream, encodeTIFF, saveTIFF } from 'utils/data-conversion';

// Download for testing
const download = false;

const saveDownload = maskData => {
  const buffer = encodeTIFF(maskData);
  saveTIFF(buffer, 'testTiff.tif');
};

export const useSaveReview = () => {
  const [{ user, assignment, maskData }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async (done = false, approve = false, updateInfo = null) => {
    try {
      // Use update info if supplied
      const buffer = createByteStream(updateInfo ? updateInfo.maskData : maskData);
      const regions = updateInfo ? updateInfo.regions : assignment.regions;

      if (download) {  
        saveDownload(maskData);
  
        //return;
      }

      await api.saveReview(user._id, assignment.id, buffer, regions, done, approve);  
      
      if (!done) {
        const comments = await api.updateComments(assignment.subvolumeId, regions);

        userDispatch({ type: SET_COMMENTS, comments: comments });
      }
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};