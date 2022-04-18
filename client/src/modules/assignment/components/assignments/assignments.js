import { useContext } from 'react';
import { Header } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Assignment } from './assignment';
import styles from './styles.module.css';

export const Assignments = () => {
  const [{ login, assignments }] = useContext(UserContext);

  return (
    <>              
      { !assignments ? null
      : assignments.length === 0 ? 
        <Header 
          as='h4'
          content={ `No current assignments for ${ login }` }
          subheader='Select a new assignment from an available volume below'
        />
      :  
        <>
          <Header as='h4'>Current assignments for { login }</Header>
          <div className={ styles.container }>
            { assignments.sort((a, b) => b.updated - a.updated).map((assignment, i) => (
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