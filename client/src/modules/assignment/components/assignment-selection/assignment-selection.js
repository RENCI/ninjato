import { useContext, useState, useEffect } from 'react';
import { Tab, Menu, Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Assignments } from 'modules/assignment/components/assignments';
import { Volumes } from 'modules/assignment/components/volumes';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

export const AssignmentSelection = () => {
  const [{ user, assignments, assignment, volumes }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user) getAssignments(user._id, user.reviewer);    
  }, [user, getAssignments]);

  const onRefreshClick = () => {
    if (user) getAssignments(user._id, user.reviewer);
  };

  const reviewPane = {
    menuItem: <Menu.Item key={ 'review' }>Review</Menu.Item>,
    render: () => (
      <Tab.Pane>
         <Assignments type='ownReview' assignments={ assignments.filter(assignment => assignment.status === 'review')} />
         <Assignments type='otherReview' assignments={ assignments.filter(assignment => assignment.status === 'waiting' && assignment.user !== user.login)} />
      </Tab.Pane>
    )
  };

  const refinePane = {
    menuItem: <Menu.Item key={ 'refine' }>Refine</Menu.Item>,
    render: () => (
      <Tab.Pane>
        <Assignments type='refine' assignments={ assignments.filter(assignment => assignment.user === user.login)} />
        <Volumes />
      </Tab.Pane>
    )
  };

  const panes = [reviewPane, refinePane];

  return (
    <div>
      { (assignments && volumes) && (user.reviewer ?
        <Tab
          menu={{ secondary: true, pointing: true, attached: 'top', fluid: true, widths: panes.length }}
          panes={ panes }
        />  
      :
        <div className={ styles.container }>
          <Assignments type='refine' assignments={ assignments } />
          <Volumes />
        </div>
      )}
      <Button 
        basic 
        circular 
        icon='sync' 
        className={ styles.refresh } 
        onClick={ onRefreshClick } 
      />
    </div>
  )
};