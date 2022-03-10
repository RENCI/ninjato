import { useContext } from 'react';
import { List, Button, Icon } from 'semantic-ui-react';
import { FlagContext, FLAG_SET_FLAG, FLAG_SET_COMMENT } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { CommentInput } from 'modules/common/components/comment-input';
import { Purples, cssString } from 'utils/colors';

const { Item } = List;

export const FlagInfo = () => {
  const [{ flag, comment, links }, dispatch] = useContext(FlagContext);  
  
  const onFlagClick = () => {
    dispatch({ type: FLAG_SET_FLAG, flag: !flag });
  };

  const onCommentChange = evt => {
    dispatch({ type: FLAG_SET_COMMENT, comment: evt.target.value });
  };

  return (
    <List relaxed>
      <Item>
        <Button          
          toggle={ true }
          content='Flag region'
          icon='flag'
          compact
          color={ flag ? 'grey' : null }
          labelPosition='left'
          onClick={ onFlagClick }
        />
      </Item>
      { flag &&
      <>
        <Item>
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
          </AutoFocusForm>
        </Item>
        <Item>
          { links.length > 0 ?
            <span style={{ fontWeight: 'bold', color: cssString(Purples[5]) }}>
              <Icon name='chain' />
              { links.length } linked region{ links.length > 1 ? 's' : null } 
            </span>
          : 
            <><Icon name='broken chain' /> No linked regions</>
          }
        </Item>
      </>
      }
    </List>
  );
};