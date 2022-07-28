import { Header, Message, Icon, Segment } from 'semantic-ui-react';
import { Assignment } from './assignment';
import { statusOrder } from 'utils/assignment-utils';
import styles from './styles.module.css';

const { Subheader } = Header;

const sortOrder = (a, b) => (
  a.status !== b.status ? statusOrder(a) - statusOrder(b) :
  b.updated - a.updated
);

export const Assignments = ({ type, header, subheader, assignments }) => {
  const enabledStatus = type === 'refine' ? 'active' : type;

  return (
    <>
      <Header as='h5'>
        { header }
        <Subheader>
          { subheader }
        </Subheader>            
      </Header>
      { assignments && assignments.length > 0 ?
        <div className={ styles.container }>
          { assignments.sort(sortOrder).map((assignment, i) => (
            <div key={ i }>
              <Assignment 
                assignment={ assignment } 
                enabled={ assignment.status === enabledStatus }
              />
            </div>
          ))}
        </div>
      :
        <div className={ styles.container }>
          <Icon name='inbox' size='huge' color='grey' disabled />
        </div>
      }
    </>
  );
};