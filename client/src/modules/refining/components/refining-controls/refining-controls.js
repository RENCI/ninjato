import { useContext } from 'react';
import { Button, Icon} from 'semantic-ui-react';
import { ControlsContext, SET_EDIT_MODE } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { BrushOptions } from './brush-options';

const { Group } = Button;

export const RefiningControls = ({ sliceView, canUndo, canRedo }) => {
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
    <ControlBar>
      <Group vertical>
        { editModes.map(({ value, icon }, i) => (
          value === 'paint' || value === 'erase' ?
            <SplitButton
              key={ i }
              toggle={ true }
              icon={ icon }
              active={ value === editMode }
              content={ <BrushOptions which={ value } /> }
              onClick={ () => onModeClick(value )}
            />
          :
            <Button
              key={ i }
              icon={ icon }
              color={ value === editMode ? 'grey' : null }
              onClick={ () => onModeClick(value) }              
            />
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
    </ControlBar>
  );
};
