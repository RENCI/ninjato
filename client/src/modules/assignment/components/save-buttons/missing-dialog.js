import { useContext, useState } from 'react';
import { Button, Modal, Icon } from 'semantic-ui-react';
import { 
  UserContext, REMOVE_REGIONS,
  RefineContext, REFINE_SET_TOOL, REFINE_SET_ACTIVE_REGION
 } from 'contexts';
import { RegionLabel } from 'modules/common/components/region-label';

const { Header, Content, Actions } = Modal;

export const MissingDialog = ({ missing, onClose }) => {
  const [{ assignment }, userDispatch] = useContext(UserContext);
  const [{ activeRegion }, refineDispatch] = useContext(RefineContext);
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState(false);

  const onConfirm = async () => {
    setRemoving(true);

    userDispatch({ type: REMOVE_REGIONS, regions: missing });

    setRemoving(false);
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);

      // XXX: Code below similar to delete-dialog. Could probably refactor to a hook...
      const { regions } = assignment;

      if (regions.length === 1) {
        refineDispatch({ type: REFINE_SET_ACTIVE_REGION, region: null });
        refineDispatch({ type: REFINE_SET_TOOL, tool: 'create' });
      }
      else if (!regions.includes(activeRegion)) {
        refineDispatch({ type: REFINE_SET_ACTIVE_REGION, region: regions[0] })
      }

      onClose();
    });
  };

  const onCancel = () => {
    onClose();
  };

  const regionList = regions => regions.map((region, i, a) => (
    <>
      <RegionLabel key={ region.label } region={ region } />
      { a.length > 2 && i <= a.length - 2 ? ', ' : null }
      { a.length > 1 && i === a.length - 2 ? 'and ' : null }
    </>
  ));

  const plural = missing?.length > 1;

  return (
    <Modal
      dimmer='blurring'
      open={ missing?.length > 0 }        
    >
      <Header>Remove Missing Regions</Header>
      <Content>
        { removing ?             
          <>Processing...</>
        :  success ?
          <>
            <Icon name='check circle outline' color='green' />
            Removed region{ plural ? 's' : null } { regionList(missing) }.
          </>
        :
          missing && <>Region{ plural ? 's' : null } { regionList(missing) } { plural ? 'are' : 'is' } missing. Remove { plural ? 'them' : 'it' }?</>
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
