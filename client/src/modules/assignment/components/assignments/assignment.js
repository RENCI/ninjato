import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { UserContext, SET_ASSIGNMENT } from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { useLoadData } from 'hooks';
import { statusDisplay } from 'utils/assignment-utils';
import styles from './styles.module.css';

const statusColor = {
  active: 'green',
  waiting: 'yellow',
  review: 'teal'
};

export const Assignment = ({ assignment, enabledStatus }) => {
  const [{ assignment: currentAssignment }, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  const { name, description, status, updated, regions } = assignment;
  const selected = currentAssignment?.id === assignment.id;
  const enabled = assignment.status === enabledStatus;

  const onLoadClick = () => {
    // XXX: Need to handle getting review assignment

    userDispatch({ type: SET_ASSIGNMENT, assignment: assignment });

    loadData(assignment); 
  };

  // XXX: Need to add volume information to assignments, and show better volume information (parent, etc) in volumes

  return (
    <ButtonWrapper 
      onClick={ onLoadClick}
      disabled={ !enabled || selected }
    >
      <Segment
        color={ enabled ? statusColor[assignment.status] : 'grey' } 
        raised={ enabled }
        circular
        className={ styles.assignment }
      >  
        <div>
          <div> 
            <Header 
              as='h5'
              content={ name ? name : 'No name'}
              subheader={ description ? description : 'No description' }
            />
          </div>
          <div>
            <Label 
              basic 
              circular 
              content='Status' 
              color={ status === 'active' ? 'green' : null }
              detail={ statusDisplay(assignment) } 
            />
          </div>
          <div>
            <Label 
              basic 
              circular 
              content='Updated' 
              detail={ updated.toLocaleString() } 
            />
          </div>
          <div>
            <Label 
              basic 
              circular 
              content={ regions.length > 1 ? 'Labels' : 'Label' } 
              detail={ regions.map(({ label }) => label).sort((a, b) => a - b).join(', ') } 
            />
          </div>
        </div>
        { selected && <div className={ styles.selected }>selected</div> }
      </Segment>
    </ButtonWrapper>
  );
};