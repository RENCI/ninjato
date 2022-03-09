import { useContext, useRef } from 'react';
import { Popup, Button, Icon } from 'semantic-ui-react';
import { FlagContext, SET_COMMENT } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';

export const FlagInfo = () => {
  const [{ comment, links }, dispatch] = useContext(FlagContext);
  const ref = useRef();

  const onCommentChange = evt => {
    dispatch({ type: SET_COMMENT, comment: evt.target.value });
  };

  const onKeyPress = evt => {
    if (evt.code === 'Enter') {
      ref.current.click();
    }
  };
  
  // XXX: Need to refactor pop up code so this behavior is shared with brush options
  const cancelEvent = evt => evt.stopPropagation();

  return (
    <div 
      onClick={ cancelEvent }
      onKeyDown={ cancelEvent }
      onKeyUp={ cancelEvent }
      onKeyPres={ cancelEvent }
    >
      <Popup
        trigger={ 
          <div ref={ ref }>
            <Button           
              icon 
              basic 
              compact
            >
              <Icon name='caret down' fitted />
            </Button>
          </div>
        }
        on='click'
        position='top left'
        content={
          <AutoFocusForm onKeyPress={ onKeyPress }>
            <CommentInput 
              label='Describe problems with region'
              comment={ comment }
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
    </div>
  );
};