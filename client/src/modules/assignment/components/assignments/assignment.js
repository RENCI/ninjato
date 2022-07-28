import { useContext } from 'react';
import { Segment, Header, Label } from 'semantic-ui-react';
import { 
  UserContext, SET_ASSIGNMENT,
  ErrorContext, SET_ERROR
} from 'contexts';
import { ButtonWrapper } from 'modules/common/components/button-wrapper';
import { useLoadData } from 'hooks';
import { statusColor } from 'utils/assignment-utils';
import { api } from 'utils/api';
import styles from './styles.module.css';

export const Assignment = ({ assignment, enabled }) => {
  const [{ user, assignment: currentAssignment }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();

  const { updated, regions, annotator, reviewer } = assignment;
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
        color={ statusColor(assignment.status) ?? 'grey' } 
        raised={ enabled }
        circular
        className={ styles.assignment }
      >  
        <div>
          { annotator.login && 
            <div>
              <Label 
                basic 
                circular 
                content='User' 
                detail={ annotator.login } 
              />
            </div>
          }
          { reviewer?.login && 
            <div>
              <Label 
                basic 
                circular 
                content='Reviewer' 
                detail={ reviewer.login } 
              />
            </div>
          }
          <div>
            <Label 
              basic 
              circular 
              content={ regions.length > 1 ? 'Region labels' : 'Region label' }
              detail={ regions.map(({ label }) => label).sort((a, b) => a - b).join(', ') }
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
        </div>
        { selected && <div className={ styles.selected }>selected</div> }
      </Segment>
    </ButtonWrapper>
  );
};