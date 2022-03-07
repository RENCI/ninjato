import { useContext, Fragment } from 'react';
import { Segment, List, Button } from 'semantic-ui-react';
import { SET_ASSIGNMENT_TYPE, UserContext } from 'contexts';
import { useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Volume = ({ volume }) => {
  const [{ stages, assignment }, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  const onLoadClick = () => {
    userDispatch({ type: SET_ASSIGNMENT_TYPE, assignmentType: volume.stage });
    loadData(assignment, volume.stage);
  };

  const assignments = volume.assignments.filter(({ type }) => type === volume.stage);
  const completed = assignments.filter(({ status }) => status === 'completed');
  const active = assignments.filter(({ status }) => status === 'active');
  const available = assignments.filter(({ status }) => status === 'available');
  const enabled = available.length > 0;

  return (
    <Segment 
      color={ enabled ? 'blue' : null } 
      secondary={ !enabled }
      raised={ enabled }
    >
      <List divided relaxed>
        <List.Item>
          Volume name: 
          <div className={ styles.volumename }>
            { volume.name }
          </div>
        </List.Item>
        <List.Item>
          Progress:
          <div className={ styles.progress }>
            { stages.map((stage, i, a) => {
              const active = stage === volume.stage;
              return (
                <Fragment key={ i }>
                  <div className={ `${ styles.stage} ${ active ? styles.active : null }` }> 
                    { stage }
                  </div>
                  { i < a.length - 1 && 
                    <span className={ styles.divider }>/</span>
                  }
                </Fragment>
              );            
            })}
          </div>
        </List.Item>
        <List.Item>
          Assignments:
          <div className={ styles.assignment }>
            <span className={ styles.number }>
              { completed.length }
            </span> completed:
          </div>
          <div className={ styles.assignment }>
            <span className={ styles.number }>
              { active.length }
            </span> active
          </div>
          <div className={ styles.assignment }>
            <span className={ styles.number }>
              { available.length }
            </span> available
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