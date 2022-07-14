import { useContext, useState, useEffect } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION,
  RefineContext, REFINE_SET_ACTION, REFINE_SET_ACTIVE_REGION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/common/components/region-label';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const CreateDialog = ({ sliceView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newLabel, setNewLabel] = useState();
  const [newRegion, setNewRegion] = useState();

  useEffect(() => {  
    // Set active region after it is created   
    const region = assignment.regions.find(({ label }) => label === newLabel);
    
    if (region) {
      setNewRegion(region);
      refineDispatch({ type: REFINE_SET_ACTIVE_REGION, region: region });
    }
  }, [newLabel, assignment, refineDispatch]);

  const onConfirm = async () => {
    setCreating(true);

    try {
      const label = await api.getNewLabel(assignment.subvolumeId);

      setNewLabel(label);
      setCreating(false);
      setSuccess(true);

      userDispatch({ type: ADD_REGION, label: label });

      await sliceView.createRegion(label);

      setTimeout(async () => {
        setSuccess(false);
        setNewLabel(null);
        refineDispatch({ type: REFINE_SET_ACTION, action: null });
      }, 1000);
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setCreating(false);

      errorDispatch({ type: SET_ERROR, error: error });
    }   
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'create' }        
    >
      <Header>Create Region</Header>
      <Content>
        { creating ?             
          <>Processing...</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Now editing with new region <RegionLabel region={ newRegion } />.
          </>
        :
          action && <p>Create new region?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ creating || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ creating || success }
          loading={ creating }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
