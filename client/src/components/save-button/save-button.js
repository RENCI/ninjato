import { useContext, useState, useRef } from 'react';
import { Popup, Button, Icon } from 'semantic-ui-react';
import { UserContext, DataContext } from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF } from 'utils/data-conversion';

// Download for testing
const download = false;

export const SaveButton = ({ text, color, done = false }) => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ maskData }] = useContext(DataContext);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const ref = useRef();

  const onSave = async () => {
    const buffer = encodeTIFF(maskData);

    const blob = new Blob([buffer], { type: 'image/tiff' });

    if (download) {  
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'testTIFF.tif';

      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url); 
      a.remove();
    }
    else {
      setSaving(true);

      try {
        await api.saveAnnotations(id, assignment.itemId, blob, done);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
      catch (error) {
        console.log(error);        
      }

      setSaving(false);
    }
  };

  return (
    <Popup
      position='top center'
      open={ success }
      trigger={ 
        <Button 
          ref={ ref }
          color={ color }
          loading={ saving }
          onClick={ onSave }
        >
          { text }
        </Button>
        }
      content={ 
        <>
          <Icon name='check circle outline' color='green' />
          { done ? <>Submitted successfully</> : <>Saved successfully</> }          
        </>
      }
    />
  );
};
