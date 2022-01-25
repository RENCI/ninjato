import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { UserContext, DataContext } from 'contexts';
import { api } from 'utils/api';
import { encodeTIFF } from 'utils/data-conversion';

export const SaveButton = () => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ maskData }] = useContext(DataContext);

  const onSave = () => {
    const buffer = encodeTIFF(maskData);

    const blob = new Blob([buffer], { type: 'image/tiff' });

    const done = false;

    // Download for testing
    const download = false;

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
      try {
        api.saveAnnotations(id, assignment.itemId, blob, done);
      }
      catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <Button 
      color='green' 
      onClick={ onSave }
    >
      Save annotations
    </Button>
  );
};
