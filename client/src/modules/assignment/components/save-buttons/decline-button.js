import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, CLEAR_DATA,
  ErrorContext, SET_ERROR
} from 'contexts';
import { useModal } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const DeclineButton = ({ disabled }) => {
  const [{ user, assignment }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [open, openModal, closeModal] = useModal();
  const [declining, setDeclining] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setDeclining(true);

    try {
      const { status } = await api.declineAssignment(user._id, assignment.id);

      if (status !== 'success') throw new Error(`Error declining assignment ${ assignment.id }`); 

      setSuccess(true);
      setTimeout(() => {        
        setSuccess(false);
        openModal(false);

        userDispatch({ type: CLEAR_DATA });
      }, 1000);
    }
    catch (error) {
      console.log(error);        
      
      setDeclining(false);
      setSuccess(false);

      errorDispatch({ type: SET_ERROR, error: error });
    }

    setDeclining(false); 
  };

  return (
    <>
      <Button 
        secondary
        disabled={ disabled }
        onClick={ openModal }
      >
        Decline
      </Button>
      <Modal
        dimmer='blurring'
        open={ open }        
      >
        <Header>Decline Region</Header>
        <Content>
          { declining ?             
            <>Processing</>
          :  success ?
            <>
              <Icon name='check circle outline' color='green' />
              Declined successfully
            </>
          :
            <>
              <p>Decline current region?</p>
              <p>All edits will be lost.</p>
            </>
          }
        </Content>
        <Actions>
          <Button 
            secondary 
            disabled={ declining || success }
            onClick={ closeModal }
          >
            Cancel
          </Button>
          <Button 
            primary 
            disabled={ declining || success }
            loading={ declining }
            onClick={ onConfirm } 
          >
            Confirm
          </Button>
        </Actions>
      </Modal>
    </>
  );
};
