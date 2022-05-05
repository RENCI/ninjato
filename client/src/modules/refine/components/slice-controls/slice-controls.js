import { useContext } from 'react';
import { Label, Divider } from 'semantic-ui-react';
import { RefineContext, REFINE_SET_EDIT_MODE, REFINE_SET_CONTROL } from 'contexts';
import { ControlBar, ControlGroup, ControlButton, ControlLabel } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { BrushOptions } from './brush-options';

export const SliceControls = ({ sliceView, canUndo, canRedo }) => {
  const [{ editModes, editMode, showContours }, dispatch] = useContext(RefineContext);

  const onModeClick = value => {
    dispatch({ type: REFINE_SET_EDIT_MODE, mode: value });
  };

  const onShowContoursClick = () => {
    dispatch({ type: REFINE_SET_CONTROL, name: 'showContours', value: !showContours });
  };

  const onUndoClick = () => {
    sliceView.undo();
  };

  const onRedoClick = () => {
    sliceView.redo();
  };

  return (
    <ControlBar>
      <ControlLabel>view</ControlLabel>
      <ControlGroup>
        <ControlButton
          toggle={ true }
          icon={ 'circle outline' }
          active={ showContours  }
          onClick={ onShowContoursClick }              
        />
      </ControlGroup>
      <ControlLabel>mode</ControlLabel>
      <ControlGroup>
        { editModes.filter(({ group }) => group === 'select').map(({ value, icon }, i) => (
          <ControlButton
            key={ i }
            toggle={ true }
            icon={ icon }
            active={ value === editMode  }
            onClick={ () => onModeClick(value) }              
          />
        ))}    
      </ControlGroup>
      <ControlGroup>
        { editModes.filter(({ group }) => group === 'edit').map(({ value, icon }, i) => (
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
            <ControlButton
              key={ i }
              toggle={ true }
              icon={ icon }
              active={ value === editMode  }
              onClick={ () => onModeClick(value) }              
            />
        ))}    
      </ControlGroup>
      <ControlLabel>undo/redo</ControlLabel>
      <ControlGroup>
        <ControlButton
          icon='undo alternate'        
          disabled={ !canUndo }
          onClick={ onUndoClick }
        />
        <ControlButton
          icon='redo alternate'          
          disabled={ !canRedo }
          onClick={ onRedoClick }
        />
      </ControlGroup>
    </ControlBar>
  );
};
