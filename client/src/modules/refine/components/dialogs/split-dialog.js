import { useContext, useState, useEffect } from 'react';
import { Button, Modal, Icon, Select } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION,
  RefineContext, REFINE_SET_ACTION, REFINE_SET_ACTIVE_REGION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/common/components/region-label';
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
  const [newRegion, setNewRegion] = useState();

  useEffect(() => {  
    // Set active region after it is created   
    const region = assignment.regions.find(({ label }) => label === newLabel);

    if (region) {
      setNewRegion(region);
      refineDispatch({ 
        type: REFINE_SET_ACTIVE_REGION, 
        region: splitMode === 'top' ? action.region : region
      });
    }
  }, [newLabel, assignment, splitMode, action, refineDispatch]);

  const onConfirm = async () => {
    setSplitting(true);

    try {
      const label = await api.getNewLabel(assignment.subvolumeId);

      userDispatch({ type: ADD_REGION, label: label });

      setNewLabel(label);
      setSplitting(false);
      setSuccess(true);

      await sliceView.splitRegion(action.region.label, label, splitMode);

      setTimeout(() => {
        setSuccess(false);
        setNewLabel(null);
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
          <>Processing...</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Split region <RegionLabel region={ action.region } />, creating new region <RegionLabel region={ newRegion } />.
          </>
        :
          action && 
          <>
            <p>Split region <RegionLabel region={ action.region } /> at current slice?</p>
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
