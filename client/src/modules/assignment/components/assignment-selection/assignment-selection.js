import { useContext, useState, useEffect } from 'react';
import { Tab, Menu, Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RefineSelection } from './refine-selection';
import { ReviewSelection } from './review-selection';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

// XXX: For refine, want anything that is this user's and not review
// For review, want anything that is this user's and review
// For waiting, want anything that is waiting and not this user's

/*
const getAssignments = (assignments, type, user) => 
  type === 'refine' ? assignments.filter(({ status }) => status === 'refine' :
  type === 'review' ? assignments.filter(({ type }) => type === 'review' :
  assignments.filter(({ type, user }) => type === ')
  */

export const AssignmentSelection = () => {
  const [{ user, assignments, volumes }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user) getAssignments(user._id, user.reviewer);    
  }, [user, getAssignments]);

  const onRefreshClick = () => {
    if (user) getAssignments(user._id, user.reviewer);
  };

  console.log(assignments);

  const reviewPane = {
    menuItem: <Menu.Item key={ 'review' }>Review</Menu.Item>,
    render: () => (
      <Tab.Pane>
         <ReviewSelection />
      </Tab.Pane>
    )
  };

  const refinePane = {
    menuItem: <Menu.Item key={ 'refine' }>Refine</Menu.Item>,
    render: () => (
      <Tab.Pane>
        <RefineSelection />
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
          <RefineSelection />
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