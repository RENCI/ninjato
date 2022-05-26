import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION,
  RefineContext, REFINE_SET_ACTION, REFINE_SET_TOOL,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const MergeDialog = ({ sliceView, volumeView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action, activeLabel }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [merging, setMerging] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setMerging(true);

    console.log("MERGE");

    setMerging(false);
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);

      refineDispatch({ type: REFINE_SET_ACTION, action: null });

      // MERGE
    }, 1000);

    /*
    try {      
      const label = await api.getNewLabel(assignment.subvolumeId);

      setNewLabel(label);
      setMerging(false);
      setSuccess(true);

      userDispatch({ type: ADD_REGION, label: label });

      setTimeout(async () => {
        setSuccess(false);

        refineDispatch({ type: REFINE_SET_ACTION, action: null });

        sliceView.setActiveLabel(label);
        sliceView.mergeRegion();
        volumeView.setActiveLabel(label);

        refineDispatch({ type: REFINE_SET_TOOL, tool: 'paint' });
      }, 1000);
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setMerging(false);

      errorDispatch({ type: SET_ERROR, error: error });
    }   
    */
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
