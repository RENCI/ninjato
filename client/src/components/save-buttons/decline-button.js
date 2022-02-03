import { useContext, useState, useRef } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, DataContext, CLEAR_DATA } from 'contexts';
//import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const DeclineButton = ({ disabled }) => {
  // const [{ id, assignment }] = useContext(UserContext);
  const [, dataDispatch] = useContext(DataContext);
  const [showModal, setShowModal] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [success, setSuccess] = useState(false);
  const ref = useRef();

  const onDecline = () => {
    setShowModal(true);
  };

  const onConfirm = async () => {
    setDeclining(true);

    try {
      // XXX: Need an decline endpoint
      // await api.saveAnnotations(id, assignment.itemId, blob, true);

      setSuccess(true);
      setTimeout(() => {        
        setSuccess(false);
        setShowModal(false);

        dataDispatch({ type: CLEAR_DATA });
      }, 2000);
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
        negative
        disabled={ disabled }
        onClick={ onDecline }
      >
        Decline
      </Button>
      <Modal
        dimmer='blurring'
        open={ showModal }        
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
            <>Decline current region? All edits will be lost.</>
          }
        </Content>
        <Actions>
          <Button 
            negative 
            disabled={ declining || success }
            onClick={ () => setShowModal(false) }
          >
            Cancel
          </Button>
          <Button 
            positive 
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
