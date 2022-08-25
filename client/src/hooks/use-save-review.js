import { useContext } from 'react';
import { 
  UserContext,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF } from 'utils/data-conversion';

export const useSaveReview = () => {
  const [{ user, assignment, maskData }] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async (done = false, approve = false) => {
    try {
      const buffer = encodeTIFF(maskData);

      await api.saveReview(user._id, assignment.id, buffer, assignment.regions, done, approve);      
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};