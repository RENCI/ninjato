import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { UserContext, DataContext } from 'contexts';
import { api } from 'utils/api';
import { writeTIFF } from 'utils/data-conversion';

export const SaveButton = () => {
  const [{ assignment }] = useContext(UserContext);
  const [{ maskData }] = useContext(DataContext);

  console.log(assignment);

  const onSave = () => {
     // Create blobs
    // const dataBlob = data => {
    //  return new Blob([data], { type: "mimeString" });
    //};

    //const expressionBlob = dataBlob(rawExpressionData);

    const buffer = writeTIFF(maskData);

    api.saveAnnotations();
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
