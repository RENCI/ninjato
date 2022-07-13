import { useContext, useState, useEffect } from 'react';
import { Tab, Menu, Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RefineSelection } from './refine-selection';
import { ReviewSelection } from './review-selection';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

// For refine, want anything that is this user's, currently indicated by empty user field
// For review, want anything that is review 
// For waiting, want anything that is waiting and not this user's
const filterAssignments = (assignments, type, user = null) => 
  type === 'refine' ? assignments.filter(({ user }) => !user) :
  type === 'review' ? assignments.filter(({ status }) => status === 'review') :
  assignments.filter(assignment => assignment.status === 'waiting' && assignment.user !== user);

export const AssignmentSelection = () => {
  const [{ user, assignments, volumes }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user) getAssignments(user._id, user.reviewer);    
  }, [user, getAssignments]);

  const onRefreshClick = () => {
    if (user) getAssignments(user._id, user.reviewer);
  };

  return (
    <div className={ styles.container }>
      { (assignments && volumes) && (user.reviewer ?
        <Tab
          menu={{ secondary: true, pointing: true, attached: 'top', fluid: true, widths: 2 }}
          panes={[
            {
              menuItem: <Menu.Item key={ 'review' }>Review</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <ReviewSelection 
                    review={ filterAssignments(assignments, 'review') } 
                    waiting={ filterAssignments(assignments, 'waiting', user.login) } 
                  />                      
                </Tab.Pane>
              )
            },
            {
              menuItem: <Menu.Item key={ 'refine' }>Refine</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <RefineSelection 
                    assignments={ filterAssignments(assignments, 'refine') } 
                  />
                </Tab.Pane>
              )
            }
          ]}
        />  
      :
        <div className={ styles.refine }>
          <RefineSelection 
            assignments={ filterAssignments(assignments, 'refine') } 
          />
        </div>
      )}
      <Button 
        basic 
        circular 
        size='tiny'
        icon='sync'         
        className={ styles.refresh } 
        onClick={ onRefreshClick } 
      />
    </div>
  )
};