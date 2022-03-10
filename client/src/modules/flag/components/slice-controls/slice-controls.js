import { useContext } from 'react';
import { Button, Popup, Icon } from 'semantic-ui-react';
import { FlagContext, FLAG_SET_FLAG } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { FlagInfo } from 'modules/flag/components/slice-controls/flag-info';

const { Group } = Button;

export const SliceControls = () => {
  const [{ flag }, dispatch] = useContext(FlagContext);

  return (
    <ControlBar>
      <Group vertical>
        <Popup
          trigger={ 
            <Button           
              toggle
              icon='flag'
              color={ flag ? 'grey' : null }
            >
            </Button>
          }
          on='click'
          position={ 'top left' }
          content={ <FlagInfo /> }
        />
      </Group>
    </ControlBar>
  );
};
