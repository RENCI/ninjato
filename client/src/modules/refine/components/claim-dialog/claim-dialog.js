import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, UPDATE_ASSIGNMENT,//, SET_ASSIGNMENT, CLEAR_DATA,
  RefineContext, REFINE_SET_ACTION,
  ErrorContext, SET_ERROR
} from 'contexts';
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
      await api.claimRegion(id, assignment.subvolumeId, assignment.id, action.label);

      setClaiming(false);
      setSuccess(true);
      
      setTimeout(async () => {
        setSuccess(false);

        refineDispatch({ type: REFINE_SET_ACTION, action: null });
        
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
          <>Processing</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Claimed successfully
          </>
        :
          action && <p>Add region <b>{ action && action.label }</b> to this assignment?</p>
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
