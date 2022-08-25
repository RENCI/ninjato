import { useContext, useState } from 'react';
import { Popup, Button, Icon } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { MissingDialog } from './missing-dialog';
import { useSaveAnnotations, useSaveReview } from 'hooks';
import { getMissingRegions } from 'utils/data';

export const SaveButton = ({ disabled, review = false, onSaving }) => {
  const [{ assignment, maskData }] = useContext(UserContext);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [missing, setMissing] = useState();
  const saveAnnotations = useSaveAnnotations();
  const saveReview = useSaveReview();

  const saveAssignment = async () => {
    setSaving(true);
    onSaving(true);

    if (review) {
      await saveReview();
    }
    else {
      await saveAnnotations();
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 1000);

    setSaving(false);
    onSaving(false);
  }

  const onSave = () => {
    const missing = getMissingRegions(maskData, assignment.regions);

    if (missing.length > 0) {
      setMissing(missing);
    }
    else {
      saveAssignment();
    }
  };

  const onMissingClose = () => {
    setMissing();
    saveAssignment();
  }

  return (
    <>
      <Popup
        position='top center'
        open={ success }
        trigger={ 
          <Button 
            basic
            primary
            disabled={ disabled}
            loading={ saving }
            onClick={ onSave }
          >
            Save
          </Button>
          }
        content={ 
          <>
            <Icon name='check circle outline' color='green' />
            Saved successfully
          </>
        }
      />
      <MissingDialog 
        missing={ missing }
        onClose={ onMissingClose }
      />
    </>
  );
};
