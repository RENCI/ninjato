import { useContext, useEffect } from 'react';
import { UserContext } from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { Assignments } from 'modules/assignment/components/assignments';
import { Volumes } from 'modules/assignment/components/volumes';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

export const AssignmentSelection = () => {
  const [{ user, assignments, volumes }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user) getAssignments(user._id);    
  }, [user, getAssignments]);

  return (
    <>
      { (assignments && volumes) &&
        <>
          <div className={ styles.container }>
            <Assignments />
            <Volumes />
          </div>
        </>
      }
    </>
  )
};