import { useContext } from 'react';
import { Button, Icon} from 'semantic-ui-react';
import { ControlsContext, SET_EDIT_MODE } from 'contexts';
import { BrushOptions } from './brush-options';
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
            as='div'
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1 1 auto' }}
            key={ i }
            toggle
            icon
            compact
            color={ value === editMode ? 'grey' : null }
            onClick={ () => onModeClick(value) } 
          >
            <div style={{ marginRight: '.5rem', marginLeft: '.5rem' }}><Icon name={ icon } fitted /></div>
            <div><BrushOptions which={ value }/></div>
          </Button>
        ))}    
      </Group>
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
