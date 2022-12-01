import { useContext, useCallback } from 'react';
import { 
  UserContext, SET_ASSIGNMENTS, SET_AVAILABLE_REVIEWS, SET_VOLUMES,
  LoadingContext, SET_LOADING, CLEAR_LOADING,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';

export const useGetAssignments = () => {
  const [, userDispatch] = useContext(UserContext);
  const [, loadingDispatch] = useContext(LoadingContext);
  const [{ error }, errorDispatch] = useContext(ErrorContext);

  return useCallback(async user => {
    const { id, reviewer, trainee } = user;

    if (!error) {
      try {
        loadingDispatch({ type: SET_LOADING }); 

        const { assignments, availableReviews } = await api.getAssignments(id, reviewer, trainee);

        const volumes = await api.getVolumes(reviewer, trainee);

        userDispatch({
          type: SET_ASSIGNMENTS,
          assignments: assignments
        });

        if (reviewer) {
          userDispatch({
            type: SET_AVAILABLE_REVIEWS,
            availableReviews: availableReviews
          });
        }

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