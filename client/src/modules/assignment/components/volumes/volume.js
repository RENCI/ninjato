import { useContext, useState } from 'react';
import { Segment, Header, Progress, Label, Divider } from 'semantic-ui-react';
import { 
  UserContext, SET_ASSIGNMENT, ADD_REVIEWS,
  ErrorContext, SET_ERROR 
} from 'contexts';
import { Assignments } from 'modules/assignment/components/assignments';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { ChooseButton } from './choose-button';
import { VolumeMessage } from './volume-message';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';
import styles from './styles.module.css';

const numLoad = 5;

const emptyMessage = {
  header: null,
  message: null
};

export const Volume = ({ volume, availableReviews, enabled }) => {
  const [{ user }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [message, setMessage] = useState(emptyMessage);
  const loadData = useLoadData();

  const { name, description, numRegions, annotations, trainingInfo } = volume;
  const { active, available, completed } = annotations;

  const review = Boolean(availableReviews);

  const [unloadedReviews, loadedReviews] = availableReviews ? 
    availableReviews.assignments.reduce((result, assignment) => {
      assignment.needToLoad ? result[0].push(assignment) : result[1].push(assignment);
      return result;
    }, [[], []]) : [null, null];

  const onLoadClick = async () => {
    if (review) {

      const start = unloadedReviews.findIndex(({ needToLoad }) => needToLoad);
      const end = Math.min(start + numLoad - 1, unloadedReviews.length - 1);

      const newReviews = [];

      try {
        for (let i = start; i <= end; i++) {
          const assignment = await api.getAssignment(volume.id, unloadedReviews[i].id);

          newReviews.push(assignment);          

          userDispatch({ type: ADD_REVIEWS, volumeId: volume.id, reviews: newReviews });
        }
      }
      catch (error) {
        errorDispatch({ type: SET_ERROR, error: error });
      }
    }
    else {
      try {
        const assignment = await api.getNewAssignment(user._id, volume.id);

        if (assignment) {
          userDispatch({ type: SET_ASSIGNMENT, assignment: assignment });

          loadData(assignment);
        }
        else {
          setMessage({ 
            header: 'No assignment available',
            message: 'No assignments are available for the selected volume'
          });
        }
      }
      catch (error) {
        errorDispatch({ type: SET_ERROR, error: error });
      }
    }
  };

  const onMessageDismiss = () => {
    setMessage(emptyMessage);
  };

  const isEnabled = review ? 
    unloadedReviews.length > 0 :
    enabled && available > 0;

  return (    
    <>
      <ButtonWrapper 
        onClick={ onLoadClick } 
        disabled={ !isEnabled }
      >
        <Segment 
          color={ available ? 'blue' : 'grey' } 
          raised={ isEnabled }
          className={ styles.volume }
        >
          <div>         
            { volume.trainingUser &&    
              <div> 
                <Header 
                  as='h5'
                  content={ 'trainee' }
                  subheader={ volume.trainingUser }
                />
              </div>
            }
            <div> 
              <Header 
                as='h5'
                content={ name }
                subheader={ description ? description : 'No description' }
              />
            </div>
            <div>
              <Progress
                className={ styles.progressBar }
                percent={ Math.round(completed / numRegions * 100) } 
                progress='percent' 
                color='blue'
                active={ active > 0 }
              />
            </div>
            <div>          
              <Header 
                as='h5' 
                className={ styles.assignmentsHeader }
                content='Assignments' 
              />
              <div className={ styles.labels }>
                <Label basic color='blue' content='available' detail={ available } />
                <Label basic color='green' content='active' detail={ active } />
                <Label basic color='grey' content='completed' detail={ completed } />
              </div>
            </div>
            { trainingInfo && 
              <>
                <Divider />
                <div>
                  <Header as='h5'>
                    Training progress
                    <Header.Subheader>
                      <div className={ styles.trainingInfo }>
                        Dice score: <span>
                          { trainingInfo.diceScore.toFixed(4) }
                        </span>
                      </div>
                      <div className={ styles.trainingInfo }>
                        Region difference: <span>
                          { (trainingInfo.regionDifference > 0 ? '+' : '') + trainingInfo.regionDifference }
                        </span>
                      </div>
                    </Header.Subheader>
                  </Header>
                </div>
              </>
            }
          </div>
          { process.env.NODE_ENV === 'development' && 
            <div className={ styles.chooseButton }>
              <ChooseButton 
                volumeId={ volume.id }
                disabled={ !isEnabled } 
              />
            </div>
          }
        </Segment>
      </ButtonWrapper>
      { review &&        
        <>
          <Header 
            as='h5'
            content=''
            subheader={ unloadedReviews.length > 0 ? 
              'Click volume to load more available reviews'
            :
              loadedReviews.length > 0 && unloadedReviews.length === 0 ? 
              'All available reviews loaded'
            : 
              null
            }
          />
          <Assignments 
            type='review' 
            assignments={ loadedReviews } 
            showEmpty={ false }
          />
        </>
      }
      <VolumeMessage 
        header={ message.header } 
        message={ message.message } 
        onDismiss={ onMessageDismiss }
      />
    </>
  );  
};