import { useContext, useState, useEffect, useRef } from 'react';
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
  const [needToSave, setNeedToSave] = useState(false);

  // XXX: Hack to save after claiming
  useEffect(() => {

    console.log(maskData.getExtent());
    if (needToSave && action === null) {
      switch (assignment.status) {
        case 'active':
          saveAnnotations();
          break;

        case 'review':
          saveReview();
          break;

        default:
          console.warn('Unknown assignment type');
      }

      setNeedToSave(false);
    }
  }, [needToSave, action]);

  const onConfirm = async () => {
    setClaiming(true);

    try {      
      await api.claimRegion(user._id, assignment.subvolumeId, assignment.id, action.region.label);

      setClaiming(false);
      setSuccess(true);
      
      setTimeout(async () => {
        const update = await api.updateAssignment(assignment.subvolumeId, assignment.id);

        userDispatch({
          type: UPDATE_ASSIGNMENT,
          assignment: update
        });

console.log(maskData.getExtent());

        loadData(update, assignment);   

        setSuccess(false);
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null }); 

        setNeedToSave(true);
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
