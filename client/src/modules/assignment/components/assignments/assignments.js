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

export const Assignments = () => {
  const [{ login, assignments }] = useContext(UserContext);

  const hasActiveAssignment = hasActive(assignments);

  return (
    <>              
      { !assignments ? null
      : assignments.length === 0 ? 
        <Header as='h4'>
          No current assignments for { login }
          <Subheader>Select a new assignment from an available volume below</Subheader>
        </Header>        
      :  
        <>
          <Header as='h4'>
            Current assignments for { login }
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
      }
    </>
  );
};