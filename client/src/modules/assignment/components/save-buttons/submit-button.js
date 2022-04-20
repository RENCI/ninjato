import { useContext, useState, useRef } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, DataContext, CLEAR_DATA } from 'contexts';
import { useModal, useGetAssignments } from 'hooks';
import { api } from 'utils/api';
import { encodeTIFF } from 'utils/data-conversion';

const { Header, Content, Actions } = Modal;

export const SubmitButton = ({ disabled }) => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ maskData }, dataDispatch] = useContext(DataContext);
  const [open, openModal, closeModal] = useModal();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const ref = useRef();

  const onConfirm = async () => {
    setSubmitting(true);

    const buffer = encodeTIFF(maskData);

    try {
      await api.saveAnnotations(id, assignment.id, buffer, true);

      setSuccess(true);
      setTimeout(() => {        
        setSuccess(false);
        closeModal();

        dataDispatch({ type: CLEAR_DATA });
      }, 1000);
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
        primary
        disabled={ disabled }
        onClick={ openModal }
      >
        Submit
      </Button>
      <Modal
        dimmer='blurring'
        open={ open }        
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
            secondary 
            disabled={ submitting || success }
            onClick={ closeModal }
          >
            Cancel
          </Button>
          <Button 
            primary 
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
