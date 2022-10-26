import { useContext, useEffect } from 'react';
import { Tab, Menu } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RefineSelection } from './refine-selection';
import { ReviewSelection } from './review-selection';
import { RefreshButton } from 'modules/common/components/refresh-button';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

// For refine, want anything where this user is the annotator
// For review, want anything where this user is the reviewer
const filterAssignments = (assignments, type, login) => (
  type === 'review' ? assignments.filter(({ reviewer }) => reviewer?.login === login) :
  assignments.filter(({ annotator }) => annotator?.login === login)
);

export const AssignmentSelection = () => {
  const [{ user, assignments, availableReviews, volumes }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user) getAssignments(user._id, user.reviewer);    
  }, [user, getAssignments]);

  const onRefreshClick = () => {
    getAssignments(user._id, user.reviewer);
  };

  return (
    <div className={ styles.container }>
      { (assignments && volumes) && (user.reviewer ?
        <Tab
          menu={{ secondary: true, pointing: true, attached: 'top' }}
          panes={[
            {
              menuItem: <Menu.Item key={ 'review' }>Review</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <ReviewSelection 
                    review={ filterAssignments(assignments, 'review', user.login) } 
                    waiting={ availableReviews } 
                  />                      
                </Tab.Pane>
              )
            },
            {
              menuItem: <Menu.Item key={ 'refine' }>Refine</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <RefineSelection 
                    assignments={ filterAssignments(assignments, 'refine', user.login) } 
                  />
                </Tab.Pane>
              )
            }
          ]}
        />  
      :
        <div className={ styles.refine }>
          <RefineSelection 
            assignments={ filterAssignments(assignments, 'refine', user.login) } 
          />
        </div>
      )}
      <RefreshButton 
        className={ styles.refresh }
        message={ 'refresh assignments'}
        onClick={ onRefreshClick } 
      />
    </div>
  )
};