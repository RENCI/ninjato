import { useContext, useState } from 'react';
import { Popup, Button, Icon } from 'semantic-ui-react';
import { 
  UserContext, 
  DataContext,
  ErrorContext, SET_ERROR
} from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF, saveTIFF } from 'utils/data-conversion';

// Download for testing
const download = false;

export const SaveButton = ({ disabled, onSaving }) => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ maskData }] = useContext(DataContext);
  const [, errorDispatch] = useContext(ErrorContext);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSave = async () => {
    setSaving(true);
    onSaving(true);

    const buffer = encodeTIFF(maskData);

    if (download) {  
      saveTIFF(buffer, 'testTiff.tif');

      setSaving(false);      
      onSaving(false);

      return;
    }

    try {
      await api.saveAnnotations(id, assignment.id, buffer);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
    }
    catch (error) {
      console.log(error);   
      
      errorDispatch({ type: SET_ERROR, error: error });     
    }

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
