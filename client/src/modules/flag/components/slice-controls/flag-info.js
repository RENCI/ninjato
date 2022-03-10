import { useContext } from 'react';
import { List } from 'semantic-ui-react';
import { FlagContext, FLAG_SET_COMMENT } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';
import { Purples, cssString } from 'utils/colors';

const { Item } = List;

export const FlagInfo = () => {
  const [{ comment, links }, dispatch] = useContext(FlagContext);

  const onCommentChange = evt => {
    dispatch({ type: FLAG_SET_COMMENT, comment: evt.target.value });
  };

  return (
    <AutoFocusForm>
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
      <List>
        { links.length > 0 ?
          <span style={{ fontWeight: 'bold', color: cssString(Purples[5]) }}>
            { links.length } linked region{ links.length > 1 ? 's' : null }
          </span>
        : 
          <>No linked regions</>
        }
      </List>
    </AutoFocusForm>
  );
};