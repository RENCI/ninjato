import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, CLEAR_DATA } from 'contexts';
import { useModal, useSaveReview } from 'hooks';

const { Header, Content, Actions } = Modal;

export const VerifyButton = ({ disabled }) => {
  const [, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const saveReview = useSaveReview();

  const onConfirm = async () => {
    setVerifying(true);

    await saveReview(true, true);

    setVerifying(false);
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
        Verify
      </Button>
      <Modal
        dimmer='blurring'
        open={ open }        
      >
        <Header>Verify Assignment</Header>
        <Content>
          { verifying ?             
            <>Processing</>
          :  success ?
            <>
              <Icon name='check circle outline' color='green' />
              Verified successfully!
            </>
          :
            <>Verify assignment as completed?</>
          }
        </Content>
        <Actions>
          <Button 
            secondary 
            disabled={ verifying || success }
            onClick={ closeModal }
          >
            Cancel
          </Button>
          <Button 
            primary 
            disabled={ verifying || success }
            loading={ verifying }
            onClick={ onConfirm } 
          >
            Confirm
          </Button>
        </Actions>
      </Modal>
    </>
  );
};
