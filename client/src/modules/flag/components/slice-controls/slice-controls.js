import { useContext } from 'react';
import { Popup, Button } from 'semantic-ui-react';
//import { FlagContext, SET_EDIT_MODE, SET_COMMENT } from 'contexts';
import { ControlBar } from 'modules/common/components/control-bar';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';

const { Group } = Button;

export const SliceControls = ({ sliceView, canUndo, canRedo }) => {
  //const [{ editModes, editMode }, dispatch] = useContext(FlagContext);

  const onLinkClick = value => {
  };

  const onCommentChange = evt => {
    console.log(evt.target.value);
  };

  return (
    <ControlBar>
      <Group vertical>
        <Popup
          trigger={ 
            <Button           
              icon='flag'
              compact
            />
          }
          on='click'
          position='top right'
          content={ 
          <AutoFocusForm>
            <CommentInput 
              label='Describe problems with region'
              options={[
                'Merge',
                'Split',
                'Remove'
              ]}
              onChange={ onCommentChange }
            /></AutoFocusForm>
          }
        />
      </Group>
      <Group vertical>
        <Button
          icon='chain'
          toggle
          color='grey'
          compact
          onClick={ onLinkClick }
        />
        <Button
          icon='broken chain'
          toggle
          color='grey'
          compact
          onClick={ onLinkClick }
        />
      </Group>
    </ControlBar>
  );
};
