import { useContext, useEffect, useState } from 'react';
import { Tab, Menu, Checkbox } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RefineSelection } from './refine-selection';
import { ReviewSelection } from './review-selection';
import { RefreshButton } from 'modules/common/components/refresh-button';
import { useGetAssignments } from 'hooks';
import styles from './styles.module.css';

const isTrainingVolume = volume => Boolean(volume.trainingUser);

const filterTraining = (assignments, volumes, training) => 
  training === null ? assignments :
    assignments.filter(({ subvolumeId }) => {
      const volume = volumes.find(({ id }) => id === subvolumeId);
      return isTrainingVolume(volume) === training;
    }
);

// For refine, want anything where this user is the annotator
// For review, want anything where this user is the reviewer
const filterAssignments = (assignments, volumes, type, login, training = null) => {
  const filtered = type === 'review' ? assignments.filter(({ reviewer }) => reviewer?.login === login) :
    assignments.filter(({ annotator }) => annotator?.login === login);

  return filterTraining(filtered, volumes, training);
};

const filterTrainingVolumes = (volumes, training) => (
  training === null ? volumes :
  volumes.filter(volume => isTrainingVolume(volume) === training)
);

export const AssignmentSelection = () => {
  const [{ user, assignments, availableReviews, volumes }] = useContext(UserContext);
  const [training, setTraining] = useState(user.reviewer ? false : null);
  const getAssignments = useGetAssignments();

  const validAssignments = assignments ? assignments.filter(({ status }) => 
    status === 'active' || status === 'review' || status === 'waiting') : null;

  useEffect(() => {
    if (user) getAssignments(user);  
  }, [user, getAssignments]);

  const onRefreshClick = () => {
    getAssignments(user);
  };

  const onTrainingToggle = () => {
    setTraining(!training);
  };

  return (
    <div className={ styles.container }>
      { (validAssignments && volumes) && (user.reviewer ?
        <Tab
          menu={{ secondary: true, pointing: true, attached: 'top' }}
          panes={[
            {
              menuItem: <Menu.Item key={ 'review' }>Review</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <div style={{ width: '100%', textAlign: 'right' }}>
                    <Checkbox 
                      toggle
                      label='Training'
                      checked={ training }
                      onChange={ onTrainingToggle }
                    /> 
                  </div>
                  <ReviewSelection 
                    review={ filterAssignments(validAssignments, volumes, 'review', user.login, training) } 
                    waiting={ availableReviews } 
                    volumes={ filterTrainingVolumes(volumes, training) }
                    training={ training }
                  />                     
                </Tab.Pane>
              )
            },
            {
              menuItem: <Menu.Item key={ 'refine' }>Refine</Menu.Item>,
              render: () => (
                <Tab.Pane>
                  <RefineSelection 
                    assignments={ filterAssignments(validAssignments, volumes, 'refine', user.login) } 
                  />
                </Tab.Pane>
              )
            }
          ]}
        />  
      :
        <div className={ styles.refine }>
          <RefineSelection 
            assignments={ filterAssignments(validAssignments, volumes, 'refine', user.login) } 
            training={ training || user.trainee === true }
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