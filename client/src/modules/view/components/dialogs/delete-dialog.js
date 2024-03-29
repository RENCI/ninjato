import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, REMOVE_REGION,
  AnnotateContext, ANNOTATE_SET_ACTION, ANNOTATE_SET_TOOL
} from 'contexts';
import { RegionLabel } from 'modules/region/components/region-label';

const { Header, Content, Actions } = Modal;

export const DeleteDialog = ({ sliceView }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ action }, annotateDispatch] = useContext(AnnotateContext);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setDeleting(true);

    await sliceView.deleteRegion(action.region);

    userDispatch({ type: REMOVE_REGION, region: action.region });

    setDeleting(false);
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });

      const { regions } = assignment;

      if (regions.length === 1) {
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'create' });
      }
    }, 1000);
  };

  const onCancel = () => {
    annotateDispatch({ type: ANNOTATE_SET_ACTION, action: null });
  };

  return (
    <Modal
      dimmer='blurring'
      open={ action && action.type === 'delete' }        
    >
      <Header>Delete Region</Header>
      <Content>
        { deleting ?             
          <>Processing...</>
        : success ?
          <>
            <Icon name='check circle outline' color='green' />
            Deleted region <RegionLabel region={ action.region } />.
          </>
        : 
          action && <>Delete region <RegionLabel region={ action.region } />?</>
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
