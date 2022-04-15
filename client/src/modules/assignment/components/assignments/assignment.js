import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { SET_ASSIGNMENT_TYPE, UserContext } from 'contexts';
import { useGetAssignments, useLoadData } from 'hooks';
import styles from './styles.module.css';

export const Assignment = ({ assignment }) => {
  console.log(assignment);

  const { name, description, updated, labels } = assignment;

  const enabled = true; // XXX: How to check if active or not?

  return (
    <Segment
      color={ enabled ? 'green' : null } 
      secondary={ !enabled }
      raised={ enabled }
      circular
      className={ styles.assignment }
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
  );
};