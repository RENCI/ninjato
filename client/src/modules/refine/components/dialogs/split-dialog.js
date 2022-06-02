import { useContext, useState } from 'react';
import { Button, Modal, Icon, Select } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION,
  RefineContext, REFINE_SET_ACTION, REFINE_SET_ACTIVE_LABEL,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const SplitDialog = ({ sliceView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [splitting, setSplitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [splitMode, setSplitMode] = useState('bottom');
  const [newLabel, setNewLabel] = useState();

  const onConfirm = async () => {
    setSplitting(true);

    try {
      const label = await api.getNewLabel(assignment.subvolumeId);

      setNewLabel(label);
      setSplitting(false);
      setSuccess(true);

      userDispatch({ type: ADD_REGION, label: label });

      sliceView.splitRegion(action.label, label, splitMode);

      refineDispatch({ type: REFINE_SET_ACTIVE_LABEL, label: action.label });

      setTimeout(() => {
        setSuccess(false);
        refineDispatch({ type: REFINE_SET_ACTION, action: null });
      }, 1000);
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setSplitting(false);

      errorDispatch({ type: SET_ERROR, error: error });
    } 
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'split' }        
    >
      <Header>Split Region</Header>
      <Content>
        { splitting ?             
          <>Processing</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Split region <b>{ action.label }</b>, creating new region <b>{ newLabel }</b>.
          </>
        :
          action && 
          <>
            <p>Split region <b>{ action.label }</b> at current slice?</p>
            <Select 
              value={ splitMode }
              options={[
                { key: 'bottom', value: 'bottom', text: 'Include slice in bottom (new) region' },
                { key: 'top', value: 'top', text: 'Include slice in top (current) region' }
              ]}
              onChange={ (evt, item) => setSplitMode(item.value) }
            />    
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
