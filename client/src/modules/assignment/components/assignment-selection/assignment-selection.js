import { useContext, useEffect } from 'react';
import { Grid } from 'semantic-ui-react';
import { 
  UserContext, SET_VOLUMES,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { Volume } from './volume';
import { useGetAssignments } from 'hooks';
import { api } from 'utils/api';

const { Column } = Grid;

export const AssignmentSelection = () => {
  const [{ id, login, volumes }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {
    if (id) getAssignments(id);
/*    
    const getVolumes = async () => {
      try {
        const volumes = await api.getVolumes();

        userDispatch({ type: SET_VOLUMES, volumes: volumes });
      }
      catch (error) {
        console.log(error);

        errorDispatch({ type: SET_ERROR, error: error });
      }
    };

    getVolumes();
*/    
  }, [id, getAssignments]);

  return (
    <>
      { login &&
        <>
          <AssignmentMessage>
            Select assignment
          </AssignmentMessage>
          <Grid centered padded stretched doubling columns={ 4 }>
            { volumes.map((volume, i) => (
              <Column key={ i }>
                <Volume volume={ volume } />
              </Column>
            ))}
          </Grid>
        </>
      }
    </>
  )
};