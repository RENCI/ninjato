import { useContext } from 'react';
import { RefineContext, REFINE_SET_EDIT_MODE } from 'contexts';
import { ControlBar, ControlGroup, ControlButton } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { BrushOptions } from './brush-options';

export const SliceControls = ({ sliceView, canUndo, canRedo }) => {
  const [{ editModes, editMode }, dispatch] = useContext(RefineContext);

  const onModeClick = value => {
    dispatch({ type: REFINE_SET_EDIT_MODE, mode: value });
  };

  const onUndoClick = () => {
    sliceView.undo();
  };

  const onRedoClick = () => {
    sliceView.redo();
  };

  return (
    <ControlBar>
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
