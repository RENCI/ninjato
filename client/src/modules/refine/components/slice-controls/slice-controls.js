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

  const groups = editModes.reduce((groups, { group }) => {
    if (!groups.includes(group)) groups.push(group);
    return groups;
  }, []);

  return (
    <ControlBar>
      <ControlLabel>view</ControlLabel>
      <ControlGroup>
        <ControlButton
          toggle={ true }
          icon={ 'circle outline' }
          active={ showContours  }
          tooltip='show contours'
          onClick={ onShowContoursClick }              
        />
      </ControlGroup>
      <ControlLabel>mode</ControlLabel>
      { groups.map(group => (
        <ControlGroup key={ group }>
          { editModes.filter(mode => mode.group === group).map(({ value, icon, tooltip }, i) => (
            value === 'paint' || value === 'erase' ?
              <SplitButton
                key={ i }
                toggle={ true }
                icon={ icon }
                tooltip={ tooltip }
                active={ value === editMode }
                content={ <BrushOptions which={ value } /> }
                onClick={ () => onModeClick(value )}
              />
            :
              <ControlButton
                key={ i }
                toggle={ true }
                icon={ icon }
                tooltip={ tooltip }
                active={ value === editMode  }
                onClick={ () => onModeClick(value) }              
              />
          ))}
        </ControlGroup>
      ))}
      <ControlLabel>undo/redo</ControlLabel>
      <ControlGroup>
        <ControlButton
          icon='undo alternate'        
          tooltip='undo'
          disabled={ !canUndo }
          onClick={ onUndoClick }
        />
        <ControlButton
          icon='redo alternate'          
          tooltip='redo'
          disabled={ !canRedo }
          onClick={ onRedoClick }
        />
      </ControlGroup>
    </ControlBar>
  );
};
