import { Header } from 'semantic-ui-react';
import { Assignment } from './assignment';
import { EmptyList } from 'modules/assignment/components/empty-list';
import { statusOrder } from 'utils/assignment-utils';
import styles from './styles.module.css';

const { Subheader } = Header;

const sortOrder = (a, b) => (
  a.status !== b.status ? statusOrder(a.status) - statusOrder(b.status) :
  b.updated - a.updated
);

export const Assignments = ({ type, header, subheader, assignments, showEmpty = true }) => {
  const enabled = ({ status, reviewer }) => 
    type === 'refine' ? status === 'active' :
    status !== 'active' || !reviewer?.login;

  return (
    <>
      <Header as='h5'>
        { header }
        { subheader && 
          <Subheader>
            { subheader }
          </Subheader>
        }             
      </Header>
      { assignments && assignments.length > 0 ?
        <div className={ styles.container }>
          { assignments.sort(sortOrder).map((assignment, i) => (
            <div key={ i }>
              <Assignment 
                assignment={ assignment } 
                enabled={ enabled(assignment) }
              />
            </div>
          ))}
        </div>
      :
        <>{ showEmpty && <EmptyList /> }</>
      }
    </>
  );
};