import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, UPDATE_ASSIGNMENT, SET_ASSIGNMENT, CLEAR_DATA,
  RefineContext, REFINE_SET_CLAIM_LABEL, 
  ErrorContext, SET_ERROR
} from 'contexts';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const ClaimDialog = () => {
  const [{ id, assignment }, userDispatch] = useContext(UserContext);
  const [{ claimLabel }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setClaiming(true);

    try {
      const { status } = await api.claimRegion(id, assignment.subvolumeId, assignment.id, claimLabel);

      if (status !== 'success') throw new Error(`Error claiming region ${ claimLabel }`);

      setSuccess(true);
      setTimeout(async () => {
        setSuccess(false);
        setClaiming(false);

        refineDispatch({ type: REFINE_SET_CLAIM_LABEL, label: null });
        
        const update = await api.updateAssignment(assignment);

        userDispatch({
          type: UPDATE_ASSIGNMENT,
          assignment: update
        });
  
        loadData(update);    
/*
        userDispatch({ type: CLEAR_DATA });
        userDispatch({ type: SET_ASSIGNMENT, assignment: update, assignmentType: 'refine' });
        loadData(update); 
*/        
      }, 1000); 
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setClaiming(false);

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
