import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION,
  RefineContext, REFINE_SET_ACTION, 
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const AddDialog = () => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newLabel, setNewLabel] = useState();

  const onConfirm = async () => {
    setAdding(true);

    try {
      const label = await api.getNewLabel(assignment.subvolumeId);

      setNewLabel(label);
      setAdding(false);
      setSuccess(true);

      setTimeout(async () => {
        setSuccess(false);

        refineDispatch({ type: REFINE_SET_ACTION, action: null });
        userDispatch({ type: ADD_REGION, label: label,  });

        // XXX: Need to set the active label via refine context
      }, 1000);
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setAdding(false);

      errorDispatch({ type: SET_ERROR, error: error });
    }   
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'add' }        
    >
      <Header>Add Region</Header>
      <Content>
        { adding ?             
          <>Processing</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Now editing with new region label <b>{ newLabel }</b>
          </>
        :
          action && <p>Add new region?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ adding || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ adding || success }
          loading={ adding }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
