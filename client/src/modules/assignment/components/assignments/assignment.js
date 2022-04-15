import { useContext } from 'react';
import { Segment, Header, Label, Button } from 'semantic-ui-react';
import { SET_ASSIGNMENT_TYPE, UserContext } from 'contexts';
import { useGetAssignments, useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Assignment = ({ assignment }) => {
  console.log(assignment);

  const { name, description, updated, labels } = assignment;

  const enabled = true; // XXX: How to check if active or not?

  const onLoadClick = () => {
    console.log(assignment);

    //userDispatch({ type: SET_ASSIGNMENT_TYPE, assignmentType: 'refine' });

    //loadData(volume);

    //getAssignment(volume);
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