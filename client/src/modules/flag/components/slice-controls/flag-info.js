import { Popup, Button, Icon } from 'semantic-ui-react';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';

export const FlagInfo = () => {
  const onCommentChange = evt => {
  //  dispatch({ type: SET_COMMENT, comment: evt.target.value });
  };

  const onTriggerClick = evt => {
    console.log("TRIGGER");

    evt.stopPropagation();
  };

  return (
    <Popup
      trigger={ 
        <Button           
          icon 
          basic 
          compact
          onClick={ onTriggerClick }
        >
          <Icon name='caret down' fitted />
        </Button>
      }
      on='click'
      position='top left'
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
          />
        </AutoFocusForm>
      }
    />
  );
};