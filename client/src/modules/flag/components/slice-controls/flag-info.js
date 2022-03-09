import { useContext, useRef } from 'react';
import { FlagContext, FLAG_SET_COMMENT } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';

export const FlagInfo = () => {
  const [{ comment, links }, dispatch] = useContext(FlagContext);
  const ref = useRef();

  const onCommentChange = evt => {
    dispatch({ type: FLAG_SET_COMMENT, comment: evt.target.value });
  };

  const onKeyPress = evt => {
    if (evt.code === 'Enter') {
      ref.current.click();
    }
  };

  return (
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
  );
};