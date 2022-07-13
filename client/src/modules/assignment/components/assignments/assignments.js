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

export const Assignments = ({ type, header, subheader, assignments }) => {
  const enabledStatus = type === 'refine' ? 'active' : type;

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
            <Assignment assignment={ assignment } enabledStatus={ enabledStatus } />
          </div>
        ))}
      </div>
    </>
  );
};