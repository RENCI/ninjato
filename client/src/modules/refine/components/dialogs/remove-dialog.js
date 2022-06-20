import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, UPDATE_ASSIGNMENT,
  RefineContext, REFINE_SET_ACTION,
  ErrorContext, SET_ERROR
} from 'contexts';
import { RegionLabel } from 'modules/common/components/region-label';
import { useLoadData } from 'hooks';
import { api } from 'utils/api';

const { Header, Content, Actions } = Modal;

export const RemoveDialog = () => {
  const [{ id, assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, refineDispatch] = useContext(RefineContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const loadData = useLoadData();
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setRemoving(true);

    try {      
      const key = await api.removeRegion(id, assignment.subvolumeId, assignment.id, action.region.label);

      setRemoving(false);
      setSuccess(true);
      
      setTimeout(async () => {
        const update = await api.updateAssignment(assignment.id, assignment.subvolumeId, key);

        userDispatch({
          type: UPDATE_ASSIGNMENT,
          assignment: update
        });

        loadData(update, assignment);   

        setSuccess(false);
        refineDispatch({ type: REFINE_SET_ACTION, action: null }); 
      }, 1000); 
    }
    catch (error) {
      console.log(error);   
      
      setSuccess(false);
      setRemoving(false);

      errorDispatch({ type: SET_ERROR, error: error });
    } 
  };

  const onCancel = () => {
    refineDispatch({ type: REFINE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'remove' }        
    >
      <Header>Remove Region</Header>
      <Content>
        { removing ?             
          <>Processing...</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Removed successfully.
          </>
        :
          action && <p>Remove region <RegionLabel region={ action.region } /> from this assignment?</p>
        }
      </Content>
      <Actions>
        <Button 
          secondary 
          disabled={ removing || success }
          onClick={ onCancel }
        >
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ removing || success }
          loading={ removing }
          onClick={ onConfirm } 
        >
          Confirm
        </Button>
      </Actions>
    </Modal>
  );
};
