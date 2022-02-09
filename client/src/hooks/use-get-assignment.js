import { useContext } from 'react';
import { 
  UserContext, SET_ASSIGNMENT,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { api } from 'utils/api';

export const useGetAssignment = ()  => {
  const [, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async id => {
    try {
      const assignment = await api.getAssignment(id);

      userDispatch({
        type: SET_ASSIGNMENT,
        assignment: assignment
      });
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};