import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, REMOVE_REGION,
  RefineContext, REFINE_SET_ACTION, REFINE_SET_ACTIVE_LABEL, REFINE_SET_TOOL
} from 'contexts';

const { Header, Content, Actions } = Modal;

export const DeleteDialog = ({ sliceView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ activeLabel, action }, refineDispatch] = useContext(RefineContext);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setDeleting(true);

    userDispatch({ type: REMOVE_REGION, label: action.label });

    await sliceView.deleteRegion(action.label);

    setDeleting(false);
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      refineDispatch({ type: REFINE_SET_ACTION, action: null });

      const { regions } = assignment;

      if (regions.length === 1) {
        refineDispatch({ type: REFINE_SET_ACTIVE_LABEL, label: null });
        refineDispatch({ type: REFINE_SET_TOOL, tool: 'create' });
      }
      else if (action.label === activeLabel) {
        const newLabel = regions.length > 0 ? regions[0].label : null;

        refineDispatch({ type: REFINE_SET_ACTIVE_LABEL, label: newLabel })
      }
    }, 1000);
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'delete' }        
    >
      <Header>Delete Region</Header>
      <Content>
        { deleting ?             
          <>Processing</>
        : success ?
          <>
            <Icon name='check circle outline' color='green' />
            Deleted region <b>{ action.label }</b>
          </>
        : 
          action && <p>Delete region <b>{ action.label }</b>?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ deleting || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ deleting || success }
          loading={ deleting }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
