import { useState } from 'react';
import { Popup, Button, Icon } from 'semantic-ui-react';
import { useSaveAnnotations } from 'hooks';

export const SaveButton = ({ disabled, onSaving }) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const saveAnnotations = useSaveAnnotations();

  const onSave = async () => {
    setSaving(true);
    onSaving(true);

    await saveAnnotations();

    setSuccess(true);
    setTimeout(() => setSuccess(false), 1000);

    setSaving(false);
    onSaving(false);
  };

  return (
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
  );
};
