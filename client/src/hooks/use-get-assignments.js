import { useContext, useCallback } from 'react';
import { 
  UserContext, SET_ASSIGNMENTS, SET_VOLUMES,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';

export const useGetAssignments = () => {
  const [, userDispatch] = useContext(UserContext);
  const [{ error }, errorDispatch] = useContext(ErrorContext);

  return useCallback(async id => {
    if (!error) {
      try {
        const assignments = await api.getAssignments(id);
        const volumes = await api.getVolumes();

        userDispatch({
          type: SET_ASSIGNMENTS,
          assignments: assignments
        });

        userDispatch({
          type: SET_VOLUMES,
          volumes: volumes
        });      
      }
      catch (error) {
        console.log(error);

        errorDispatch({ type: SET_ERROR, error: error });
      }      
    }
  }, [error, userDispatch, errorDispatch]);
};