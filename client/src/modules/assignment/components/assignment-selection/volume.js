import { useContext } from 'react';
import { Segment, List, Button, Progress } from 'semantic-ui-react';
import { SET_ASSIGNMENT_TYPE, UserContext } from 'contexts';
import { useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Volume = ({ volume }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  const { description, total, active, completed } = volume;
  const available = total - active - completed;

  const onLoadClick = () => {
    userDispatch({ type: SET_ASSIGNMENT_TYPE, assignmentType: "refine" });
    loadData(assignment, volume.stage);
  };

  const enabled = available > 0;

  return (
    <Segment 
      color={ enabled ? 'blue' : null } 
      secondary={ !enabled }
      raised={ enabled }
    >
      <List divided relaxed>
        <List.Item>
          Description: 
          <div className={ styles.volumeDescription }>
            { description }
          </div>
        </List.Item>
        <List.Item>
          Progress:
          <Progress           
            percent={ Math.round(completed / total * 100) } 
            progress="percent" 
            color="blue"
          />
        </List.Item>
        <List.Item>
          Assignments:
          <div className={ styles.assignment }>
            <span className={ styles.number }>
              { available }
            </span> available
          </div>
          <div className={ styles.assignment }>
            <span className={ styles.number }>
              { active }
            </span> active
          </div>
          <div className={ styles.assignment }>
            <span className={ styles.number }>
              { completed }
            </span> completed
          </div>
          <Button 
            primary 
            disabled={ !enabled }
            onClick={ onLoadClick }
          >
            Load Assignment
          </Button>
        </List.Item>
      </List>
    </Segment>
  );  
};