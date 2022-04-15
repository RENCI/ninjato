import { useContext, useEffect } from 'react';
import { Dimmer, Loader } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { Assignments } from 'modules/assignment/components/assignments';
import { Volumes } from 'modules/assignment/components/volumes';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

export const AssignmentSelection = () => {
  const [{ id, assignments, volumes }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {    
    if (id) getAssignments(id);    
  }, [id, getAssignments]);

  return (
    <>
      { !(assignments && volumes) ?
        <Dimmer active>
          <Loader>Loading</Loader>
        </Dimmer>  
      :
        <>
          <AssignmentMessage>
            Select assignment
          </AssignmentMessage>
          <div className={ styles.container }>
            <Assignments />
            <Volumes />
          </div>
        </>
      }
    </>
  )
};