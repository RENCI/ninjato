import { useContext } from 'react';
import { Header } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Assignment } from './assignment';
import { hasActive, statusOrder } from 'utils/assignment-utils';
import styles from './styles.module.css';

const { Subheader } = Header;

const sortOrder = (a, b) => (
  a.status !== b.status ? statusOrder(a) - statusOrder(b) :
  b.updated - a.updated
);

export const Assignments = ({ type, assignments }) => {
  const [{ user }] = useContext(UserContext);

  console.log(assignments);

  const n = assignments.length;
  const hasCurrent = hasActive(assignments);

  const header = 
    type === 'ownReview' ? n > 0 ? 'Current review assignments' : 'No current review assignments' :
    type === 'otherReview' ? n > 0 ? 'Assignments awaiting review' : 'No assignments awaiting review' :
    hasCurrent ? 'Current assignments' : 'No current assignments';

  const subheader =
    type === 'ownReview' ? n > 0 ? 'Select a review to continue' : 'Select a new review assignment below' :
    type === 'otherReview' ? n > 0 ? 'Select an assignment to review' : 'Start a new assignment from the Refine panel?' :
    hasCurrent ? 'Select an assignment to continue' : 'Select a new assignment from an available volume below';

  return (
    assignments &&
    <>
      <Header as='h4'>
        { header }
        <Subheader>
          { subheader }
        </Subheader>            
      </Header>
      <div className={ styles.container }>
        { assignments.sort(sortOrder).map((assignment, i) => (
          <div key={ i }>
            <Assignment assignment={ assignment } />
          </div>
        ))}
      </div>
    </>
  );
/*
  return (
    !assignments ? null
    : assignments.length === 0 ? 
      <Header as='h4'>
        No current assignments for { user.login }
        <Subheader>Select a new assignment from an available volume below</Subheader>
      </Header>        
    :  
      <>
        <Header as='h4'>
          Current assignments for { user.login }
          <Subheader>
            { hasActiveAssignment ?
              <>Select an assignment to continue annotating</>
            : 
              <>No active assignments — select a new assignment from an available volume below</>
            } 
          </Subheader>            
        </Header>
        <div className={ styles.container }>
          { assignments.sort(sortOrder).map((assignment, i) => (
            <div key={ i }>
              <Assignment assignment={ assignment } />
            </div>
          ))}
        </div>
      </>
  );
*/
};