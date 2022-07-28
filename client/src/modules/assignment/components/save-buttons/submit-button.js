import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { UserContext, CLEAR_DATA } from 'contexts';
import { useModal, useSaveAnnotations } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const SubmitButton = ({ disabled, review = false }) => {
  const [{ user, assignment }, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const saveAnnotations = useSaveAnnotations();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setSubmitting(true);

    if (review) {
      await api.saveReview(user._id, assignment.id, assignment.regions, true, false);
    }
    else {
      await saveAnnotations(true);
    }

    setSubmitting(false);
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
        <Header>Submit { review ? 'Review' : 'Assignment' } </Header>
        <Content>
          { submitting ?             
            <>Submitting</>
          :  success ?
            <>
              <Icon name='check circle outline' color='green' />
              Submitted successfully!
            </>
          : 
            <>Submit { review ? 'review' : 'assignment for review' }?</>
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
