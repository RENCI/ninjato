import { useContext } from 'react';
import { FlagContext, FLAG_SET_SHOW_BACKGROUND } from 'contexts';
import { ControlBar, ControlGroup, ControlButton } from 'modules/common/components/control-bar';

export const VolumeControls = () => {
  const [{ showBackground }, dispatch] = useContext(FlagContext);

  const onShowBackgroundClick = () => {
    dispatch({ type: FLAG_SET_SHOW_BACKGROUND, show: !showBackground });
  };

  return (
    <ControlBar>
      <ControlGroup>
        <ControlButton
          icon='cubes'
          toggle={ true }
          active={ showBackground }
          onClick={ onShowBackgroundClick }
        />
      </ControlGroup>
    </ControlBar>
  );
};
