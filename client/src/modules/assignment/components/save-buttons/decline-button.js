import { useContext, useState, useRef } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, DataContext, CLEAR_DATA } from 'contexts';
import { useModal, useGetAssignment } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const DeclineButton = ({ disabled }) => {
  const [{ id, assignment }] = useContext(UserContext);
  const [, dataDispatch] = useContext(DataContext);
  const [open, openModal, closeModal] = useModal();
  const getAssignment = useGetAssignment();
  const [declining, setDeclining] = useState(false);
  const [success, setSuccess] = useState(false);
  const ref = useRef();

  const onConfirm = async () => {
    setDeclining(true);

    try {
      await api.declineAssignment(id, assignment.itemId);

      setSuccess(true);
      setTimeout(() => {        
        setSuccess(false);
        openModal(false);

        dataDispatch({ type: CLEAR_DATA });
      }, 1000);

      getAssignment(id);
    }
    catch (error) {
      console.log(error);        
    }

    setDeclining(false); 
  };

  return (
    <>
      <Button 
        ref={ ref }
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
