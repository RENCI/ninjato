import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext,
  RefineContext, REFINE_SET_CLAIM_LABEL, 
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const ClaimDialog = () => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ claimLabel }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setClaiming(true);

    console.log(assignment);

    try {
      await api.claimRegion(id, assignment.subvolumeId, assignment.id, claimLabel);

      setSuccess(true);
      setTimeout(() => {        
        setSuccess(false);

        refineDispatch({ type: REFINE_SET_CLAIM_LABEL, label: null });
      }, 1000);
    }
    catch (error) {
      console.log(error);   
      
      errorDispatch({ type: SET_ERROR, error: error });
    }

    setClaiming(false); 
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_CLAIM_LABEL, label: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ claimLabel !== null }        
    >
      <Header>Claim Region</Header>
      <Content>
        { claiming ?             
          <>Processing</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Claimed successfully
          </>
        :
          <>
            <p>Add region <b>{ claimLabel }</b> to this assignment?</p>
          </>
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
