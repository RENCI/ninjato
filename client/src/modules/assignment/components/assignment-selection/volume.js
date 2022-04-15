import { useContext } from 'react';
import { Segment, List, Button, Progress } from 'semantic-ui-react';
import { SET_ASSIGNMENT_TYPE, UserContext } from 'contexts';
import { useGetAssignments, useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Volume = ({ volume }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();
  const getAssignment = useGetAssignments();

  const { description, total, active, completed } = volume;
  const available = total - active - completed;

  const onLoadClick = () => {
    console.log(volume);

    userDispatch({ type: SET_ASSIGNMENT_TYPE, assignmentType: "refine" });

    //loadData(volume);

    getAssignment(volume);
  };

  const enabled = available > 0;

  return (
    <Segment 
      color={ enabled ? 'blue' : null } 
      secondary={ !enabled }
      raised={ enabled }
    >
      <List relaxed>
        <List.Item> 
          <div className={ styles.volumeDescription }>
            { description ? description : "No description" }
          </div>
        </List.Item>
        <List.Item>
          <Progress
            className={ styles.progressBar }
            percent={ Math.round(completed / total * 100) } 
            progress="percent" 
            color="blue"
          />
        </List.Item>
        <List.Item>          
          <div>Assignments</div>
          <Segment.Group piled className={ styles.assignmentList }>
            <Segment color="teal">
              <span className={ styles.number }>
                { available }
              </span> available
            </Segment>
            <Segment color="green">
              <span className={ styles.number }>
                { active }
              </span> active
            </Segment>
            <Segment color="grey">
              <span className={ styles.number }>
                { completed }
              </span> completed
            </Segment>
          </Segment.Group>
        </List.Item>
        <List.Item>
          <Button 
            className={ styles.loadButton }
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