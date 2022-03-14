import { useContext } from 'react';
import { RefineContext, REFINE_SET_SHOW_BACKGROUND } from 'contexts';
import { ControlBar, ControlGroup, ControlButton } from 'modules/common/components/control-bar';

export const VolumeControls = () => {
  const [{ showBackground }, dispatch] = useContext(RefineContext);

  const onShowBackgroundClick = () => {
    dispatch({ type: REFINE_SET_SHOW_BACKGROUND, show: !showBackground });
  };

  return (
    <ControlBar>
      <ControlGroup>
        <ControlButton
          icon='cubes'
          toggle
          color={ showBackground ? 'grey' : null }
          onClick={ onShowBackgroundClick }
        />
      </ControlGroup>
    </ControlBar>
  );
};
