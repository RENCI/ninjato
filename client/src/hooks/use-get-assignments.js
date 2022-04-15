import { useContext } from 'react';
import { 
  UserContext, SET_ASSIGNMENT,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { api } from 'utils/api';

export const useGetAssignments = () => {
  const [, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);

  return async id => {
    try {
      const assignments = await api.getAssignments(id);      

      console.log(assignments);

      const volumes = await api.getVolumes();

      console.log(volumes);

      /*
      userDispatch({
        type: SET_ASSIGNMENT,
        assignment: assignment
      });
      */
    }
    catch (error) {
      console.log(error);

      errorDispatch({ type: SET_ERROR, error: error });
    }      
  };
};