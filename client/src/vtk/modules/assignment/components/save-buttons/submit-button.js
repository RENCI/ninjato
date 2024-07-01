import { useContext, useState } from 'react';
import { Button, Modal, Icon, Message } from 'semantic-ui-react';
import { UserContext, CLEAR_DATA } from 'contexts';
import { useModal, useSaveAnnotations, useSaveReview } from 'hooks';

const { Header, Content, Actions } = Modal;

export const SubmitButton = ({ disabled, review = false }) => {
  const [{ user, assignment }, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedForReview, setSelectedForReview] = useState(false);
  const saveAnnotations = useSaveAnnotations();
  const saveReview = useSaveReview();

  const onConfirm = async () => {
    setSubmitting(true);

    let selected = false;

    if (review) {
      await saveReview(true);
    }
    else {
      const response = await saveAnnotations(true);

      selected = response.selected_for_review && !assignment.reviewer.login && user.trainee === false;

      setSelectedForReview(selected);
    }

    setSubmitting(false);
    setSuccess(true);

    setTimeout(() => {        
      setSuccess(false);
      closeModal();

      userDispatch({ type: CLEAR_DATA });
    }, selected ? 2000 : 1000);   
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
              { selectedForReview && !
                <Message 
                  icon
                  color='yellow'                  
                >
                  <Icon name='info circle' />
                  <Message.Content>Assignment was randomly selected for review</Message.Content>
                </Message>
              }
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
