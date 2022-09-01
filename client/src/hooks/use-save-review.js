import { useContext } from 'react';
import { 
  UserContext,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF, saveTIFF } from 'utils/data-conversion';

const download = false;

const saveDownload = maskData => {
  const buffer = encodeTIFF(maskData);
  saveTIFF(buffer, 'testTiff.tif');
};

export const useSaveReview = () => {
  const [{ user, assignment, maskData }] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async (done = false, approve = false) => {
    try {
      const buffer = encodeTIFF(maskData);

      if (download) {  
        saveDownload(maskData);
  
        //return;
      }

      await api.saveReview(user._id, assignment.id, buffer, assignment.regions, done, approve);      
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};