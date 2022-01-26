import { useContext } from 'react';
import { Button, Icon } from 'semantic-ui-react';
//import { ControlsContext } from 'contexts';

export const EditingControls = () => {
  //const [{ editMode }] = useContext(ControlsContext);

  const onPaintClick = () => {
    console.log('paint');
  };

  const onEraseClick = () => {
    console.log('erase');
  };

  return (
    <Button.Group vertical>
      <Button
        icon 
        onClick={ onPaintClick }
      >
        <Icon name='paint brush' />
      </Button>
      <Button 
        icon
        onClick={ onEraseClick }
      >
        <Icon name='eraser' />
      </Button>
    </Button.Group>
  );
};
