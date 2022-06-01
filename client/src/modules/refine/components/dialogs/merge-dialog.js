import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, REMOVE_REGION,
  RefineContext, REFINE_SET_ACTION
} from 'contexts';

const { Header, Content, Actions } = Modal;


// XXX: Think about how undo/redo interacts with add/remove, and how they interact with each other.
// E.g. adding and then merging a region is not handled correctly right now.
// Perhaps keep this info in the painter where undo/redo is already handled?

// XXX: Split: add a split tool, that can only overwrite current region.
// Either go back to separate split mode, or just have a toggle to constrain edits to current region.

// XXX: Region color: Set initially based on index, then store per region. Pass regions into view instead of labels.

// XXX: Don't allow editing of unclaimed regions?


export const MergeDialog = ({ sliceView }) => {
  const [, userDispatch] = useContext(UserContext);
  const [{ action, activeLabel }, refineDispatch] = useContext(RefineContext);
  const [merging, setMerging] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setMerging(true);

    setMerging(false);
    setSuccess(true);

    userDispatch({ type: REMOVE_REGION, label: action.label });

    sliceView.mergeRegion(action.label);

    setTimeout(() => {
      setSuccess(false);
      refineDispatch({ type: REFINE_SET_ACTION, action: null });
    }, 1000);
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'merge' }        
    >
      <Header>Merge Region</Header>
      <Content>
        { merging ?             
          <>Processing</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Merged region <b>{ action.label }</b> with active region <b>{ activeLabel }</b>
          </>
        :
          action && <p>Merge region <b>{ action.label }</b> with active region <b>{ activeLabel }</b>?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ merging || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ merging || success }
          loading={ merging }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};