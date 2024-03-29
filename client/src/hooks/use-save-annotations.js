import { useContext } from 'react';
import { 
  UserContext, SET_COMMENTS,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { createByteStream } from 'utils/data-conversion';

export const useSaveAnnotations = () => {
  const [{ user, assignment, maskData }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async (done = false, updateInfo = null) => {
    try {
      // Use update info if supplied
      const buffer = createByteStream(updateInfo ? updateInfo.maskData : maskData);
      const regions = updateInfo ? updateInfo.regions : assignment.regions;

      const result = await api.saveAnnotations(user._id, assignment.id, buffer, regions, done);    
      
      if (!done) {
        const comments = await api.updateComments(assignment.subvolumeId, regions);

        userDispatch({ type: SET_COMMENTS, comments: comments });
      }

      return result;
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};