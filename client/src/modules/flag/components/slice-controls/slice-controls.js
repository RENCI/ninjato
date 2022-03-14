import { useContext } from 'react';
import { Popup } from 'semantic-ui-react';
import { FlagContext } from 'contexts';
import { ControlBar, ControlGroup, ControlButton } from 'modules/common/components/control-bar';
import { FlagInfo } from 'modules/flag/components/slice-controls/flag-info';

export const SliceControls = () => {
  const [{ flag }] = useContext(FlagContext);

  return (
    <ControlBar>
      <ControlGroup>
        <Popup
          trigger={ 
            <ControlButton           
              toggle={ true }
              icon='flag'
              active={ flag }
            >
            </ControlButton>
          }
          on='click'
          position={ 'top left' }
          content={ <FlagInfo /> }
        />
      </ControlGroup>
    </ControlBar>
  );
};
