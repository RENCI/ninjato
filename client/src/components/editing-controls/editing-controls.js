import { useContext } from 'react';
import { Button, Icon } from 'semantic-ui-react';
import { SET_EDIT_MODE, ControlsContext } from 'contexts';
import styles from './styles.module.css';

const modes = [
  { value: 'paint', icon: 'paint brush' },
  { value: 'erase', icon: 'eraser' }
];

export const EditingControls = ({ sliceView, canUndo, canRedo }) => {
  const [{ editMode }, dispatch] = useContext(ControlsContext);

  const onModeClick = value => {
    dispatch({ type: SET_EDIT_MODE, mode: value });
  };

  const onUndoClick = () => {
    sliceView.undo();
  };

  const onRedoClick = () => {
    sliceView.redo();
  };

  return (
    <div className={ styles.buttons }>
      <Button.Group vertical>
        { modes.map(({ value, icon }, i) => (
          <Button 
            key={ i }
            toggle
            icon 
            color={ value === editMode ? 'grey' : null }
            onClick={ () => onModeClick(value) } 
          >
            <Icon name={ icon } />
          </Button>
        ))}
      </Button.Group>
      <Button
        icon
        disabled={ !canUndo }
        onClick={ onUndoClick }
      >
        <Icon name={ 'undo alternate'} />
      </Button>
      <Button 
        icon
        disabled={ !canRedo }
        onClick={ onRedoClick }
      >
        <Icon name={ 'redo alternate'} />
      </Button>
    </div>
  );
};
