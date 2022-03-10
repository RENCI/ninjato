import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { FlagContext, FLAG_SET_FLAG } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { FlagInfo } from 'modules/flag/components/slice-controls/flag-info';

const { Group } = Button;

export const SliceControls = () => {
  const [{ flag }, dispatch] = useContext(FlagContext);

  const onFlagClick = () => {
    dispatch({ type: FLAG_SET_FLAG, flag: !flag });
  };

  return (
    <ControlBar>
      <Group vertical>
        <SplitButton
          toggle={ true }
          icon={ 'flag' }
          active={ flag }
          content={ <FlagInfo /> }
          onClick={ () => onFlagClick() }
        />
      </Group>
    </ControlBar>
  );
};
