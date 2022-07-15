import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, CLEAR_DATA } from 'contexts';
import { useModal, useSaveAnnotations } from 'hooks';

const { Header, Content, Actions } = Modal;

export const AcceptButton = ({ disabled }) => {
  const [, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const saveAnnotations = useSaveAnnotations();
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setAccepting(true);

    //await saveAnnotations(true);

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
        <Header>Accept Region</Header>
        <Content>
          { accepting ?             
            <>Accepting</>
          :  success ?
            <>
              <Icon name='check circle outline' color='green' />
              Accepted successfully!
            </>
          :
            <>Accept assignment?</>
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
