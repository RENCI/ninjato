import { useContext, useState, useRef } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, DataContext, CLEAR_DATA } from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF } from 'utils/data-conversion';

const { Header, Content, Actions } = Modal;

export const SubmitButton = ({ disabled }) => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ maskData }, dataDispatch] = useContext(DataContext);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const ref = useRef();

  const onSubmit = () => {
    setShowModal(true);
  };

  const onConfirm = async () => {
    setSubmitting(true);

    const buffer = encodeTIFF(maskData);

    const blob = new Blob([buffer], { type: 'image/tiff' });

    try {
      await api.saveAnnotations(id, assignment.itemId, blob, true);

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

    setSubmitting(false);   
  };

  return (
    <>
      <Button 
        ref={ ref }
        positive
        disabled={ disabled }
        onClick={ onSubmit }
      >
        Submit
      </Button>
      <Modal
        dimmer='blurring'
        open={ showModal }        
      >
        <Header>Submit Region</Header>
        <Content>
          { submitting ?             
            <>Submitting</>
          :  success ?
            <>
              <Icon name='check circle outline' color='green' />
              Submitted successfully!
            </>
          :
            <>Submit region for review?</>
          }
        </Content>
        <Actions>
          <Button 
            negative 
            disabled={ submitting || success }
            onClick={ () => setShowModal(false) }
          >
            Cancel
          </Button>
          <Button 
            positive 
            disabled={ submitting || success }
            loading={ submitting }
            onClick={ onConfirm } 
          >
            Confirm
          </Button>
        </Actions>
      </Modal>
    </>
  );
};
