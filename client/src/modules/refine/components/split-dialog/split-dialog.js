import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  RefineContext, REFINE_SET_SPLIT_LABEL, 
  ErrorContext, SET_ERROR
} from 'contexts';

const { Header, Content, Actions } = Modal;

export const SplitDialog = () => {
  const [{ splitLabel }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [splitting, setSplitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setSplitting(true);

    setSuccess(true);
    setTimeout(async () => {
      setSuccess(false);
      setSplitting(false);

      refineDispatch({ type: REFINE_SET_SPLIT_LABEL, label: null });
    }, 1000);
/*

    try {
      const { status } = await api.claimRegion(id, assignment.subvolumeId, assignment.id, claimLabel);

      if (status !== 'success') throw new Error(`Error splitting region ${ claimLabel }`);

      setSuccess(true);
      setTimeout(async () => {
        setSuccess(false);
        setsplitting(false);

        refineDispatch({ type: REFINE_SET_CLAIM_LABEL, label: null });
        
        const update = await api.updateAssignment(assignment);

        userDispatch({
          type: UPDATE_ASSIGNMENT,
          assignment: update
        });
  
        loadData(update);    
        userDispatch({ type: CLEAR_DATA });
        userDispatch({ type: SET_ASSIGNMENT, assignment: update, assignmentType: 'refine' });
        loadData(update); 
      
      }, 1000); 
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setsplitting(false);

      errorDispatch({ type: SET_ERROR, error: error });
    }
*/     
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_SPLIT_LABEL, label: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ splitLabel !== null }        
    >
      <Header>Split Region</Header>
      <Content>
        { splitting ?             
          <>Processing</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Split successfully
          </>
        :
          <>
            <p>Split region <b>{ splitLabel }</b>?</p>
          </>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ splitting || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ splitting || success }
          loading={ splitting }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
