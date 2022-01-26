import { useContext } from 'react';
import { Button, Icon } from 'semantic-ui-react';
import { SET_EDIT_MODE, ControlsContext } from 'contexts';

const modes = [
  { value: 'paint', icon: 'paint brush' },
  { value: 'erase', icon: 'eraser' }
];

export const EditingControls = () => {
  const [{ editMode }, dispatch] = useContext(ControlsContext);

  const onClick = value => {
    dispatch({ type: SET_EDIT_MODE, mode: value });
  };

  return (
    <Button.Group vertical>
      { modes.map(({ value, icon }, i) => (
        <Button 
          key={ i }
          toggle
          icon 
          color={ value === editMode ? 'grey' : null }
          onClick={ () => onClick(value) } 
        >
          <Icon name={ icon } />
        </Button>
      ))}
    </Button.Group>
  );
};
