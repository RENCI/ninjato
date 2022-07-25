import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { 
  UserContext, SET_ASSIGNMENT,
  ErrorContext, SET_ERROR
} from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { useGetAssignments, useLoadData } from 'hooks';
import { statusDisplay } from 'utils/assignment-utils';
import { api } from 'utils/api';
import styles from './styles.module.css';

const statusColor = {
  active: 'green',
  waiting: 'yellow',
  review: 'teal'
};

export const Assignment = ({ assignment, enabled }) => {
  const [{ user, assignment: currentAssignment }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const getAssignments = useGetAssignments();
  const loadData = useLoadData();

  const { name, description, status, updated, regions, user: assignmentUser } = assignment;
  const selected = currentAssignment?.id === assignment.id;

  const onLoadClick = async () => {
    if (assignment.status === 'waiting') {
      try {
        await api.requestAssignment(user._id, assignment.subvolumeId, assignment.id);

        const newAssignment = {
          ...assignment,
          status: 'review'
        };
       
        userDispatch({ type: SET_ASSIGNMENT, assignment: newAssignment });

        loadData(newAssignment);
      }
      catch (error) {
        errorDispatch({ type: SET_ERROR, error: error });
      }
    }
    else {
      userDispatch({ type: SET_ASSIGNMENT, assignment: assignment });

      loadData(assignment); 
    }
  };

  // XXX: Add volume information to assignments, and show better volume information (parent, etc) in volumes?

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
          { assignmentUser && 
            <div>
              <Label 
                basic 
                circular 
                content='User' 
                detail={ assignmentUser } 
              />
            </div>
          }
          <div>
            <Label 
              basic 
              circular 
              content='Status' 
              color={ enabled ? statusColor[assignment.status] : null }
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