import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { FlagContext, FLAG_SET_SHOW_BACKGROUND } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';

const { Group } = Button;

export const VolumeControls = () => {
  const [{ showBackground }, dispatch] = useContext(FlagContext);

  const onShowBackgroundClick = () => {
    dispatch({ type: FLAG_SET_SHOW_BACKGROUND, show: !showBackground });
  };

  return (
    <ControlBar>
      <Group vertical>
        <Button
          icon='cubes'
          toggle
          color={ showBackground ? 'grey' : null }
          onClick={ onShowBackgroundClick }
        />
      </Group>
    </ControlBar>
  );
};
