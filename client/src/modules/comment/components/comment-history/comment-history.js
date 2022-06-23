import { useContext, useState, useRef, useEffect } from 'react';
import { Comment, Icon, Divider, Form, TextArea } from 'semantic-ui-react';
import { UserContext, SET_REGION_COMMENT } from 'contexts';

const { Group, Content, Author, Metadata, Text, Actions, Action } = Comment;

export const CommentHistory = ({ region }) => {
  const [{ login } , assignmentDispatch] = useContext(UserContext);
  const [comment, setComment] = useState(null);
  const [time, setTime] = useState(new Date());
  const [editing, setEditing] = useState(false);
  const textAreaRef = useRef();

  const onAddCommentClick = () => {
    setComment('');
    setEditing(true);
  };

  const onCommentChange = (evt, { value }) => {
    setComment(value);
  };  

  const onClearClick = () => {
    setComment(null);
    setEditing(false);
  };

  const onEditClick = () => {
    setEditing(true);
  };

  const onEditEnd = () => {
    setEditing(false);
    setTime(new Date());
    assignmentDispatch({ type: SET_REGION_COMMENT, region: region, comment: comment });
  };

  const stopPropagation = evt => evt.stopPropagation();

  useEffect(() => {
    textAreaRef.current?.focus();
  });

  useEffect(() => {
    setComment(region.comment);
  }, [region.comment]);

  console.log(region.comments);
  console.log(comment);

  return (
    <Group style={{ maxWidth: 'none' }}>
      { region.comments?.map(({ user, time, comment }, i) => (
        <Comment key={ i }>
          <Content>
            <Author as='span'>{ user }</Author>
            <Metadata><div>{ time.toLocaleString() }</div></Metadata>
            <Text style={{ whiteSpace: 'pre-line' }}>{ comment }</Text>
          </Content>
        </Comment>
      ))}
      { editing || comment ?
        <>    
          <Divider horizontal>New</Divider>
          <Comment>
            <Content>
              { editing ?
                <>
                  <Author as='span'>{ login }</Author>
                  <Metadata><div>Now</div></Metadata>
                  <Text>
                    <Form reply>
                      <TextArea
                        ref={ textAreaRef }
                        style={{ width: '100%', minHeight: 50 }}
                        value={ comment }
                        onChange={ onCommentChange }
                        onBlur={ onEditEnd }
                        onKeyDown={ stopPropagation }
                        onKeyUp={ stopPropagation }
                        onKeyPress={ stopPropagation }
                      />
                    </Form>
                  </Text>
                </>
              :
                <>
                  <Author as='span'>{ login }</Author>
                  <Metadata><div>{ time.toLocaleString() }</div></Metadata>
                  <Text style={{ whiteSpace: 'pre-line' }}>{ comment }</Text>
                  <Actions>
                    <Action onClick={ onEditClick }>
                      <Icon name='edit' />
                    </Action>
                    <Action onClick={ onClearClick }>
                      <Icon name='cancel' />
                    </Action>
                  </Actions>
                </>
              }
            </Content>
          </Comment>
        </>
      :   
        <Comment>
          <Content>
            <Actions>
              <Action onClick={ onAddCommentClick }>
                <Icon name='plus circle' />add comment
              </Action>
            </Actions>
          </Content>
        </Comment>          
      }
    </Group>
  );
};