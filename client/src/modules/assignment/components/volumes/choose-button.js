import { useContext, useState } from 'react';
import { Button, Modal, Input } from 'semantic-ui-react';
import { 
  UserContext, SET_ASSIGNMENT,
  ErrorContext, SET_ERROR,
} from 'contexts';
import { useLoadData, useModal } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const ChooseButton = ({ volumeId, disabled }) => {
  const [{ user }, userDispatch] = useContext(UserContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [open, openModal, closeModal] = useModal();
  const loadData = useLoadData();
  const [label, setLabel] = useState('');
  const [choosing, setChoosing] = useState(false);

  const onClick = evt => {
    evt.stopPropagation();

    openModal();
  };

  const onConfirm = async () => {
    setChoosing(true);
    
    try {
      const assignment = await api.requestAssignmentByLabel(user.id, volumeId, label);

      console.log(assignment);

      userDispatch({ type: SET_ASSIGNMENT, assignment: assignment });

      loadData(assignment);
    }
    catch (error) {
      setChoosing(false);

      errorDispatch({ type: SET_ERROR, error: error });
    }

    setChoosing(false);
  };

  const onChange = evt => {
    setLabel(evt.target.value);
  };

  return (
    <>
      <Button         
        basic
        disabled={ disabled }
        onClick={ onClick }
      >
        Choose assignment
      </Button>
      <Modal
        dimmer='blurring'
        open={ open }        
        onClick={ evt => evt.stopPropagation() }
      >
        <Header>Choose assignment</Header>
        <Content>          
          <Input
            loading={ choosing }
            placeholder='Input region label'
            value={ label }
            onChange={ onChange }
          />        
        </Content>
        <Actions>
          <Button 
            secondary 
            disabled={ choosing }
            onClick={ closeModal }
          >
            Cancel
          </Button>
          <Button 
            primary 
            disabled={ choosing || label.length === 0 }
            loading={ choosing }
            onClick={ onConfirm } 
          >
            Confirm
          </Button>
        </Actions>
      </Modal>
    </>
  );
};
