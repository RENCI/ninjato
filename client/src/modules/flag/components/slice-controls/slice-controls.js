import { useContext } from 'react';
import { Button } from 'semantic-ui-react';
import { FlagContext, SET_LINK_MODE, SET_COMMENT, SET_FLAG } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { FlagInfo } from 'modules/flag/components/slice-controls/flag-info';

const { Group } = Button;

export const SliceControls = ({ sliceView }) => {
  const [{ flag, editModes, editMode }, dispatch] = useContext(FlagContext);

  const onFlagClick = () => {
    dispatch({ type: SET_FLAG, flag: !flag });
  };

  const onModeClick = value => {
    dispatch({ type: SET_LINK_MODE, mode: value });
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
      <Group vertical>
        { editModes.map(({ value, icon }, i) => (
          <Button
            key={ i }
            toggle
            icon={ icon }
            color={ value === editMode ? 'grey' : null }
            onClick={ () => onModeClick(value) }
          />
        ))}
      </Group>
    </ControlBar>
  );
};
