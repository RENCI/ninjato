import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { ControlsContext, SET_EDIT_MODE } from 'contexts';
import { Settings } from './settings.js';
import styles from './styles.module.css';

const { Group } = Button;

export const EditingControls = ({ sliceView, canUndo, canRedo }) => {
  const [{ editModes, editMode }, dispatch] = useContext(ControlsContext);

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
      <Group vertical>
        { editModes.map(({ value, icon }, i) => (
          <Button 
            key={ i }
            toggle
            icon={ icon }
            color={ value === editMode ? 'grey' : null }
            onClick={ () => onModeClick(value) } 
          />
        ))}
      </Group>     
      <Settings />
      <Group vertical>
        <Button
          icon='undo alternate'
          disabled={ !canUndo }
          onClick={ onUndoClick }
        />
        <Button
          icon='redo alternate'
          disabled={ !canRedo }
          onClick={ onRedoClick }
        />
      </Group>
    </div>
  );
};
