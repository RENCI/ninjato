import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { api } from 'utils/api';

export const SaveButton = () => {
  const [{ assignment }] = useContext(UserContext);

  console.log(assignment);

  const onSave = () => {
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
