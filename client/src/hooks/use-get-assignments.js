import { useContext, useCallback } from 'react';
import { 
  UserContext, SET_ASSIGNMENTS, SET_VOLUMES,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { updateColors } from 'utils/colors';

export const useGetAssignments = () => {
  const [, userDispatch] = useContext(UserContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [{ error }, errorDispatch] = useContext(ErrorContext);

  return useCallback(async id => {
    if (!error) {
      try {
        loadingDispatch({ type: SET_LOADING }); 

        const assignments = await api.getAssignments(id);

        assignments.forEach(({ regions }) => updateColors(regions));

        const volumes = await api.getVolumes();

        userDispatch({
          type: SET_ASSIGNMENTS,
          assignments: assignments
        });

        userDispatch({
          type: SET_VOLUMES,
          volumes: volumes
        });

        loadingDispatch({ type: CLEAR_LOADING });
      }
      catch (error) {
        console.log(error);

        loadingDispatch({ type: CLEAR_LOADING });

        errorDispatch({ type: SET_ERROR, error: error });
      }      
    }
  }, [error, userDispatch, loadingDispatch, errorDispatch]);
};