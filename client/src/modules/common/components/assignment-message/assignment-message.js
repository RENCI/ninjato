import { useContext } from 'react';
import { Message } from 'semantic-ui-react';
import { UserContext, UPDATE_ASSIGNMENT } from 'contexts';
import { RegionSelect } from 'modules/region/components/region-select';
import { CommentContainer } from 'modules/comment/components/comment-container';
import { AnnotationOptions } from 'modules/options/components/annotation-options';
import { RefreshButton } from 'modules/common/components/refresh-button';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';
import styles from './styles.module.css';

export const AssignmentMessage = () => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const loadData = useLoadData();

  const n = assignment?.regions.length;

  const onRefreshClick = async () => { 
    const update = await api.updateAssignment(assignment.subvolumeId, assignment.id);

    userDispatch({
      type: UPDATE_ASSIGNMENT,
      assignment: update,
      keepRegions: 'old'
    });

    loadData(update, assignment, true);
  };

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
               <div>No regions</div>
            :
              <>
                <div>
                  <>{ n } region{ n > 1 ? 's' : null }:</>
                </div>
                <RegionSelect />
                <CommentContainer />
                <AnnotationOptions />
                <RefreshButton 
                  className={ styles.refresh }
                  message={ 'refresh assignment'}
                  onClick={ onRefreshClick } 
                />
              </>
            }
          </>
        }
      </Message>
  );
};