import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, REMOVE_REGION,
  RefineContext, REFINE_SET_ACTION
} from 'contexts';
import { RegionLabel } from 'modules/common/components/region-label';

const { Header, Content, Actions } = Modal;

export const MergeDialog = ({ sliceView }) => {
  const [, userDispatch] = useContext(UserContext);
  const [{ action, activeRegion }, refineDispatch] = useContext(RefineContext);
  const [merging, setMerging] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setMerging(true);

    userDispatch({ type: REMOVE_REGION, region: action.region });

    await sliceView.mergeRegion(action.region);

    setMerging(false);
    setSuccess(true);

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
          <>Processing...</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Merged region <RegionLabel region={ action.region } /> with active region <RegionLabel region={ activeRegion } />.
          </>
        :
          action && <>Merge region <RegionLabel region={ action.region } /> with active region <RegionLabel region={ activeRegion } />?</>
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
