import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, CLEAR_DATA } from 'contexts';
import { useModal } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const AcceptButton = ({ disabled }) => {
  const [{ user, assignment }, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setAccepting(true);

    await api.saveReview(user._id, assignment.id, assignment.regions, true, true);

    setAccepting(false);
    setSuccess(true);

    setTimeout(() => {        
      setSuccess(false);
      closeModal();

      userDispatch({ type: CLEAR_DATA });
    }, 1000);   
  };

  return (
    <>
      <Button 
        positive
        disabled={ disabled }
        onClick={ openModal }
      >
        Accept
      </Button>
      <Modal
        dimmer='blurring'
        open={ open }        
      >
        <Header>Accept Assignment</Header>
        <Content>
          { accepting ?             
            <>Processing</>
          :  success ?
            <>
              <Icon name='check circle outline' color='green' />
              Accepted successfully!
            </>
          :
            <>Accept assignment as completed?</>
          }
        </Content>
        <Actions>
          <Button 
            secondary 
            disabled={ accepting || success }
            onClick={ closeModal }
          >
            Cancel
          </Button>
          <Button 
            primary 
            disabled={ accepting || success }
            loading={ accepting }
            onClick={ onConfirm } 
          >
            Confirm
          </Button>
        </Actions>
      </Modal>
    </>
  );
};
