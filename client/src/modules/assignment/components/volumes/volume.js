import { useContext } from 'react';
import { Segment, Header, Button, Progress, Label } from 'semantic-ui-react';
import { SET_ASSIGNMENT_TYPE, UserContext } from 'contexts';
import { useGetAssignments, useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Volume = ({ volume }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();
  const getAssignment = useGetAssignments();

  console.log(volume);

  const { name, description, numRegions, annotations } = volume;
  const { active, available, completed } = annotations;

  const onLoadClick = () => {
    console.log(volume);

    userDispatch({ type: SET_ASSIGNMENT_TYPE, assignmentType: 'refine' });

    //loadData(volume);

    getAssignment(volume);
  };

  const enabled = available > 0;

  return (
    <Segment 
      color={ enabled ? 'blue' : null } 
      secondary={ !enabled }
      raised={ enabled }
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
            <Label basic color='blue' content='Available' detail={ available } />
            <Label basic color='green' content='Active' detail={ active } />
            <Label basic color='grey' content='Completed' detail={ completed } />
          </div>
        </div>
        <div>
          <Button 
            className={ styles.loadButton }
            primary 
            disabled={ !enabled }
            onClick={ onLoadClick }
          >
            Load assignment
          </Button>
        </div>
      </div>
    </Segment>
  );  
};