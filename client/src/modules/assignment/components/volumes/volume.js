import { useContext } from 'react';
import { Segment, Header, Button, Progress } from 'semantic-ui-react';
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
      className={ styles.volume }
    >
      <div>
        <div> 
          <Header 
            as='h5'
            dividing
            content={ name }
            subheader={ description ? description : "No description" }
          />
        </div>
        <div>
          <Progress
            className={ styles.progressBar }
            percent={ Math.round(completed / numRegions * 100) } 
            progress="percent" 
            color="blue"
          />
        </div>
        <div>          
          <div>Assignments</div>
          <Segment.Group piled className={ styles.assignmentList }>
            <Segment 
              color="teal"
              secondary={ !enabled }
            >
              <span className={ styles.number }>
                { available }
              </span> available
            </Segment>
            <Segment 
              color="green"
              secondary={ !enabled }
            >
              <span className={ styles.number }>
                { active }
              </span> active
            </Segment>
            <Segment 
              color="grey"
              secondary={ !enabled }
            >
              <span className={ styles.number }>
                { completed }
              </span> completed
            </Segment>
          </Segment.Group>
        </div>
        <div>
          <Button 
            className={ styles.loadButton }
            primary 
            disabled={ !enabled }
            onClick={ onLoadClick }
          >
            Load Assignment
          </Button>
        </div>
      </div>
    </Segment>
  );  
};