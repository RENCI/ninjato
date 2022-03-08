import { useContext } from 'react';
import { Popup, Button, Icon } from 'semantic-ui-react';
import { FlagContext, SET_LINK_MODE, SET_COMMENT, SET_FLAG } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';
import { SplitButton } from 'modules/common/components/split-button';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';
import { FlagInfo } from 'modules/flag/components/slice-controls/flag-info';

import { BrushOptions } from 'modules/refine/components/slice-controls/brush-options';

const { Group } = Button;

export const SliceControls = ({ sliceView }) => {
  const [{ flag, linkModes, linkMode }, dispatch] = useContext(FlagContext);

  const onFlagClick = () => {
    dispatch({ type: SET_FLAG, flag: !flag });
  };

  const onModeClick = value => {
    dispatch({ type: SET_LINK_MODE, mode: value });
  };

  const onCommentChange = evt => {
    dispatch({ type: SET_COMMENT, comment: evt.target.value });
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
        { linkModes.map(({ value, icon }, i) => (
          <Button
            key={ i }
            toggle
            icon={ icon }
            color={ value === linkMode ? 'grey' : null }
            onClick={ () => onModeClick(value) }
          />
        ))}
      </Group>
    </ControlBar>
  );
};
