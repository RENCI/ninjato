import { useContext, useState, useEffect } from 'react';
import { Button, Modal, Icon, Select } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION, SET_ACTIVE_REGION,
  AnnotateContext, ANNOTATE_SET_ACTION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/region/components/region-label';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const SplitDialog = ({ sliceView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, annotateDispatch] = useContext(AnnotateContext);
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
    }
  }, [newLabel, assignment, splitMode, action, annotateDispatch]);

  const onConfirm = async () => {
    setSplitting(true);

    try {
      const label = await api.getNewLabel(assignment.subvolumeId);

      userDispatch({ 
        type: ADD_REGION, 
        label: label, 
        makeActive: splitMode === 'top' ? action.region.label : label 
      });

      setNewLabel(label);
      setSplitting(false);
      setSuccess(true);

      await sliceView.splitRegion(action.region.label, label, splitMode);

      setTimeout(() => {
        setSuccess(false);
        setNewLabel(null);
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
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
    annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
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
