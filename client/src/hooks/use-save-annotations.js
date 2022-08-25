import { useContext } from 'react';
import { 
  UserContext,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF, saveTIFF } from 'utils/data-conversion';

// Download for testing
const download = false;

const saveDownload = maskData => {
  const buffer = encodeTIFF(maskData);
  saveTIFF(buffer, 'testTiff.tif');
};

export const useSaveAnnotations = () => {
  const [{ user, assignment, maskData }] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async (done = false) => {
    try {
      const buffer = encodeTIFF(maskData);
  
      if (download) {  
        saveDownload(maskData);
  
        return;
      }

      await api.saveAnnotations(user._id, assignment.id, buffer, assignment.regions, done);      
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};