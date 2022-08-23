import { useContext } from 'react';
import { AnnotateContext, ANNOTATE_SET_TOOL, ANNOTATE_SET_CONTROL } from 'contexts';
import { ControlBar, ControlGroup, ControlButton, ControlLabel } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { BrushOptions } from 'modules/common/components/brush-options';

export const SliceControls = () => {
  const [{ activeRegion, tools, tool, showContours }, annotateDispatch] = useContext(AnnotateContext);

  const onToolClick = value => {
    annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: value });
  };

  const onShowContoursClick = () => {
    annotateDispatch({ type: ANNOTATE_SET_CONTROL, name: 'showContours', value: !showContours });
  };

  const reviewTools = tools.filter(({ group }) => group === 'edit');

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
      <ControlGroup>
        { reviewTools.map(({ value, icon, tooltip, alwaysEnabled }, i) => (
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
    </ControlBar>
  );
};
