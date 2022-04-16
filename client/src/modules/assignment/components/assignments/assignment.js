import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { UserContext, SET_ASSIGNMENT } from 'contexts';
import { useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Assignment = ({ assignment }) => {
  const [, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  const { name, description, updated, labels } = assignment;

  const enabled = true; // XXX: How to check if active or not?

  const onLoadClick = () => {
    userDispatch({ 
      type: SET_ASSIGNMENT, 
      assignment: assignment, 
      assignmentType: 'refine' 
    });

    loadData(assignment);
  };

  return (
    <div
      role='button'
      tabIndex={ 0 }
      onClick={ onLoadClick }
    >
      <Segment
        color={ enabled ? 'green' : null } 
        secondary={ !enabled }
        raised={ enabled }
        circular
        className={ `clickable ${ styles.assignment }` }
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
            <Label basic circular content='Updated' detail={ updated.toLocaleString() } />
          </div>
          <div>
            <Label basic circular content='Labels' detail={ labels.join(', ') } />
          </div>
        </div>
      </Segment>
    </div>
  );
};