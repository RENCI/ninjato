import { useContext } from 'react';
import { 
  UserContext, CLEAR_SAVE_LABELS,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF, saveTIFF } from 'utils/data-conversion';

// Download for testing
const download = false;

export const useSaveAnnotations = () => {
  const [{ id, assignment, maskData, addedLabels, removedLabels }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async (done = false) => {
    try {
      const buffer = encodeTIFF(maskData);
  
      if (download) {  
        const buffer = encodeTIFF(maskData);
        saveTIFF(buffer, 'testTiff.tif');
  
        return;
      }

      await api.saveAnnotations(id, assignment.id, buffer, addedLabels, removedLabels, done);      

      userDispatch({ type: CLEAR_SAVE_LABELS });
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};