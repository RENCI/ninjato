import { useContext, useState, useEffect } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, ADD_REGION,
  AnnotateContext, ANNOTATE_SET_ACTION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/region/components/region-label';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const CreateDialog = ({ sliceView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, annotateDispatch] = useContext(AnnotateContext);
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
    }
  }, [newLabel, assignment]);

  const onConfirm = async () => {
    setCreating(true);

    try {
      const label = await api.getNewLabel(assignment.subvolumeId);

      setNewLabel(label);
      setCreating(false);
      setSuccess(true);

      userDispatch({ type: ADD_REGION, label: label, makeActive: label });

      await sliceView.createRegion(label);

      setTimeout(() => {
        setSuccess(false);
        setNewLabel(null);
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
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
    annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
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
