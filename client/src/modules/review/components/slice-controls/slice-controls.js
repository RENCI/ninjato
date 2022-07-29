import { useContext } from 'react';
import { AnnotateContext, ANNOTATE_SET_CONTROL } from 'contexts';
import { ControlBar, ControlGroup, ControlButton, ControlLabel } from 'modules/common/components/control-bar';

export const SliceControls = () => {
  const [{ showContours }, refineDispatch] = useContext(AnnotateContext);

  const onShowContoursClick = () => {
    refineDispatch({ type: ANNOTATE_SET_CONTROL, name: 'showContours', value: !showContours });
  };

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
    </ControlBar>
  );
};
