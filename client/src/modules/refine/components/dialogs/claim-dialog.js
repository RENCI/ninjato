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

export const ClaimDialog = () => {
  const [{ user, assignment, maskData }, userDispatch] = useContext(UserContext);
  const [{ action }, annotateDispatch] = useContext(AnnotateContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();
  const saveAnnotations = useSaveAnnotations();
  const saveReview = useSaveReview();
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setClaiming(true);

    try {      
      // XXX: Hack to handle adding regions before claiming
      // Should be removed when merging current edits with new volume incorporating claimed/removed region on the server
      if (assignment.status === 'review') {
        await saveReview();
      }
      else {
        await saveAnnotations();
      }

      await api.claimRegion(user._id, assignment.subvolumeId, assignment.id, action.region.label);

      setClaiming(false);
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
      console.log(error);   
      
      setSuccess(false);
      setClaiming(false);

      errorDispatch({ type: SET_ERROR, error: error });
    } 
  };

  const onCancel = () => {
    annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'claim' }        
    >
      <Header>Claim Region</Header>
      <Content>
        { claiming ?             
          <>Processing...</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Claimed region successfully.
          </>
        :
          action && <p>Add region <RegionLabel region={ action.region } /> to this assignment?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ claiming || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ claiming || success }
          loading={ claiming }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
