import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, UPDATE_ASSIGNMENT,
  RefineContext, REFINE_SET_ACTION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/common/components/region-label';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const ClaimDialog = () => {
  const [{ id, assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setClaiming(true);

    try {      
      await api.claimRegion(id, assignment.subvolumeId, assignment.id, action.region.label);

      setClaiming(false);
      setSuccess(true);
      
      setTimeout(async () => {
        const update = await api.updateAssignment(assignment.id, assignment.subvolumeId, assignment.assignmentKey);

        userDispatch({
          type: UPDATE_ASSIGNMENT,
          assignment: update
        });

        loadData(update, assignment);   

        setSuccess(false);
        refineDispatch({ type: REFINE_SET_ACTION, action: null }); 
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
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
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
