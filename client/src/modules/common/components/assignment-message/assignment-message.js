import { useContext } from 'react';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RegionSelect } from 'modules/region/components/region-select';
import { CommentContainer } from 'modules/comment/components/comment-container';
import styles from './styles.module.css';

export const AssignmentMessage = () => {
  const [{ assignment }] = useContext(UserContext);

  const n = assignment?.regions.length;

  return (
      <Message attached className={ styles.message }>
        { !assignment ? 
          <>Select assignment</>
        : 
          <>
            <div className={ styles.assignmentType }>
              { assignment.status === 'review' ? 'Review' : 'Refine' }
            </div>
            { n === 0 ? 
               <>No regions</>
            :
              <>
                <div>
                  <>{ n } region{ n > 1 ? 's' : null }:</>
                </div>
                <RegionSelect />
                <CommentContainer />
              </>
            }
          </>
        }
      </Message>
  );
};