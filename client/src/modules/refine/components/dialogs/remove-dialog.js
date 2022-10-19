import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, UPDATE_ASSIGNMENT,
  AnnotateContext, ANNOTATE_SET_ACTION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/region/components/region-label';
import { useLoadData, useSaveAnnotations, useSaveReview } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const RemoveDialog = () => {
  const [{ user, assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, annotateDispatch] = useContext(AnnotateContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();
  const saveAnnotations = useSaveAnnotations();
  const saveReview = useSaveReview();
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cantRemove, setCantRemove] = useState(false);

  const onConfirm = async () => {
    setRemoving(true);
          
    // XXX: Hack to handle adding regions before claiming
      // Should be removed when merging current edits with new volume incorporating claimed/removed region on the server
    if (assignment.status === 'review') {
      await saveReview();
    }
    else {
      await saveAnnotations();
    }

    try {      
      await api.removeRegion(user._id, assignment.subvolumeId, assignment.id, action.region.label);

      setRemoving(false);
      setSuccess(true);
      
      setTimeout(async () => {
        const update = await api.updateAssignment(assignment.subvolumeId, assignment.id);

        userDispatch({
          type: UPDATE_ASSIGNMENT,
          assignment: update
        });

        loadData(update, assignment);   

        setSuccess(false);
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null }); 
      }, 1000); 
    }
    catch (error) {
      if (error.response.data.message.includes('KeyError')) {
        setRemoving(false);
        setCantRemove(true);

        setTimeout(async () => {
          setCantRemove(false);
          annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null }); 
        }, 3000); 
      }
      else {
        setSuccess(false);
        setRemoving(false);

        errorDispatch({ type: SET_ERROR, error: error });
      }
    } 
  };

  const onCancel = () => {
    annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'remove' }        
    >
      <Header>Remove Region</Header>
      <Content>
        { removing ?             
          <>Processing...</>
        : success ?
          <>
            <Icon name='check circle outline' color='green' />
            Removed successfully.
          </>
        : cantRemove ?
          <>
            <Icon name='exclamation triangle' color='yellow'/>
            Can't remove region. Try deleting instead.
          </>
        :
          action && <p>Remove region <RegionLabel region={ action.region } /> from this assignment?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ removing || success || cantRemove}
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ removing || success || cantRemove}
          loading={ removing }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
