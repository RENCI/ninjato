import { useContext } from 'react';
import { 
  UserContext, UNDO_REGION_HISTORY, REDO_REGION_HISTORY, 
  AnnotateContext, ANNOTATE_SET_TOOL, ANNOTATE_SET_CONTROL
} from 'contexts';
import { ControlBar, ControlGroup, ControlButton, ControlLabel } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { BrushOptions } from 'modules/common/components/brush-options';

export const SliceControls = ({ sliceView, canUndo, canRedo }) => {
  const [{ activeRegion }, userDispatch] = useContext(UserContext);
  const [{ tools, tool, showContours }, annotateDispatch] = useContext(AnnotateContext);

  const onToolClick = value => {
    annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: value });
  };

  const onShowContoursClick = () => {
    annotateDispatch({ type: ANNOTATE_SET_CONTROL, name: 'showContours', value: !showContours });
  };

  const onUndoClick = () => {
    sliceView.undo();
    userDispatch({ type: UNDO_REGION_HISTORY });
  };

  const onRedoClick = () => {
    sliceView.redo();
    userDispatch({ type: REDO_REGION_HISTORY });
  };

  const groups = tools.reduce((groups, { group }) => {
    if (!groups.includes(group)) groups.push(group);
    return groups;
  }, []);

  return (
    <ControlBar>
      <ControlLabel>options</ControlLabel>
      <ControlGroup>
        <ControlButton
          toggle={ true }
          icon={ 'circle outline' }
          active={ showContours  }
          tooltip='show contours'
          onClick={ onShowContoursClick }              
        />
      </ControlGroup>
      <ControlLabel>tool</ControlLabel>
      { groups.map(group => (
        <ControlGroup key={ group }>
          { tools.filter(tool => tool.group === group).map(({ value, icon, tooltip, alwaysEnabled }, i) => (
            value === 'paint' || value === 'erase' ?
              <SplitButton
                key={ i }
                toggle={ true }
                icon={ icon }
                tooltip={ tooltip }
                active={ value === tool }
                disabled={ !alwaysEnabled && !activeRegion }
                content={ <BrushOptions which={ value } /> }
                onClick={ () => onToolClick(value)}
              />
            :
              <ControlButton
                key={ i }
                toggle={ true }
                icon={ icon }
                tooltip={ tooltip }
                active={ value === tool  }
                disabled={ !alwaysEnabled && !activeRegion }
                onClick={ () => onToolClick(value) }              
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
