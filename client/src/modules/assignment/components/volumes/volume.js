import { useContext } from 'react';
import { Segment, Header, Progress, Label } from 'semantic-ui-react';
import { 
  UserContext, SET_ASSIGNMENT, 
  ErrorContext, SET_ERROR } from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';
import styles from './styles.module.css';

export const Volume = ({ volume }) => {
  const [{ id, assignment }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();

  const { name, description, numRegions, annotations } = volume;
  const { active, available, completed } = annotations;

  const onLoadClick = async () => {
    console.log(id, volume.id);

    try {
      const assignment = await api.getNewAssignment(id, volume.id);

      userDispatch({ 
        type: SET_ASSIGNMENT, 
        assignment: assignment, 
        assignmentType: 'refine' 
      });

      loadData(assignment);
    }
    catch (error) {
      errorDispatch({ type: SET_ERROR, error: error });
    }
  };

  const enabled = available > 0;

  return (    
    <ButtonWrapper onClick={ onLoadClick}>
      <Segment 
        color={ enabled ? 'blue' : null } 
        secondary={ !enabled }
        raised={ enabled }
        className={ `clickable ${ styles.volume }` }
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
              <Label basic color='blue' content='Available' detail={ available } />
              <Label basic color='green' content='Active' detail={ active } />
              <Label basic color='grey' content='Completed' detail={ completed } />
            </div>
          </div>
        </div>
      </Segment>
    </ButtonWrapper>
  );  
};