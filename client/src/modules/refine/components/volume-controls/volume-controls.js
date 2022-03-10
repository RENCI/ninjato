import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { RefineContext, REFINE_SET_SHOW_BACKGROUND } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';

const { Group } = Button;

export const VolumeControls = () => {
  const [{ showBackground }, dispatch] = useContext(RefineContext);

  const onShowBackgroundClick = () => {
    dispatch({ type: REFINE_SET_SHOW_BACKGROUND, show: !showBackground });
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
