import { useContext } from 'react';
import { Segment, Header, Progress, Label } from 'semantic-ui-react';
import { 
  UserContext, SET_ASSIGNMENT, 
  ErrorContext, SET_ERROR 
} from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { ChooseButton } from './choose-button';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';
import styles from './styles.module.css';

export const Volume = ({ volume, enabled }) => {
  const [{ user }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();

  const { name, description, numRegions, annotations } = volume;
  const { active, available, completed } = annotations;

  const onLoadClick = async () => {
    try {
      const assignment = await api.getNewAssignment(user._id, volume.id);

      userDispatch({ type: SET_ASSIGNMENT, assignment: assignment });

      loadData(assignment);
    }
    catch (error) {
      errorDispatch({ type: SET_ERROR, error: error });
    }
  };

  const isEnabled = enabled && available > 0;

  return (    
    <ButtonWrapper 
      onClick={ onLoadClick} 
      disabled={ !isEnabled }
    >
      <Segment 
        color={ available ? 'blue' : 'grey' } 
        raised={ isEnabled }
        className={ styles.volume }
      >
        <div>
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
        </div>
        { process.env.NODE_ENV && 
          <div className={ styles.chooseButton }>
            <ChooseButton 
              volumeId={ volume.id }
              disabled={ !isEnabled } 
            />
          </div>
        }
      </Segment>
    </ButtonWrapper>
  );  
};