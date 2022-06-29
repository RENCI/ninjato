import { useContext, useEffect } from 'react';
import { Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
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

  const onRefreshClick = () => {
    if (user) getAssignments(user._id);
  };

  return (
    <>
      { (assignments && volumes) &&
        <>
          <div className={ styles.container }>
            <Assignments />
            <Volumes />
            <Button 
              basic 
              circular 
              icon='sync' 
              className={ styles.refresh } 
              onClick={ onRefreshClick } 
            />
          </div>
        </>
      }
    </>
  )
};