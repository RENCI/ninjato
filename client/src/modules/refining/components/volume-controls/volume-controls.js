import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { ControlsContext, SET_SHOW_BACKGROUND } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';

export const VolumeControls = ({  }) => {
  const [{ showBackground }, dispatch] = useContext(ControlsContext);

  const onShowBackgroundClick = () => {
    dispatch({ type: SET_SHOW_BACKGROUND, show: !showBackground });
  };

  return (
    <ControlBar>
      <Button
        icon='cubes'
        compact
        toggle
        color={ showBackground ? 'grey' : null }
        onClick={ onShowBackgroundClick }
      />
    </ControlBar>
  );
};
