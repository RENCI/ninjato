import { useContext, useState, useRef, useEffect } from 'react';
import { Comment, Icon, Form, Dropdown, Button, TextArea } from 'semantic-ui-react';
import { UserContext, SET_REGION_COMMENT } from 'contexts';

const { Group, Content, Author, Metadata, Text, Actions, Action } = Comment;

export const CommentHistory = ({ region }) => {
  const [{ user } , assignmentDispatch] = useContext(UserContext);
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

  const onInsert = value => {
    setComment(comment ? comment + '\n' + value : value);
  };

  const stopPropagation = evt => evt.stopPropagation();

  useEffect(() => {
    textAreaRef.current?.focus();
  });

  useEffect(() => {
    setComment(region.comment);
  }, [region.comment]);

  const options = ['Overtraced', 'Undertraced'];  

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
          <Comment>
            <Content>
              { editing ?
                <>
                  <Author as='span'>{ user.login }</Author>
                  <Metadata>
                    <div>Now</div>
                  </Metadata>
                  <Text>
                    <Form reply>          
                      <Dropdown text='Insert'>
                        <Dropdown.Menu>
                          { options.map((option, i) => (
                            <Dropdown.Item 
                              key={ i } 
                              text={ option } 
                              onClick={ () => onInsert(option) } 
                            /> 
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                      <TextArea
                        ref={ textAreaRef }
                        style={{ width: '100%', minHeight: 50, marginBottom: '1em' }}
                        value={ comment }
                        spellCheck={ false }
                        onChange={ onCommentChange }
                        //onBlur={ onEditEnd }
                        onKeyDown={ stopPropagation }
                        onKeyUp={ stopPropagation }
                        onKeyPress={ stopPropagation }
                      />
                      <Button.Group fluid>
                      <Button  
                        style={{ flex: '0 1 auto' }}
                        secondary  
                        size='small'
                        icon='x'
                        onClick={ onClearClick }                 
                      />
                      <Button 
                        style={{ flex: '1 1 auto' }}
                        primary
                        size='small'
                        icon='check'
                        onClick={ onEditEnd }                       
                      />
                      </Button.Group>
                    </Form>
                  </Text>
                </>
              :
                <>
                  <Author as='span'>{ user.login }</Author>
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
          <Button 
            basic
            fluid
            icon='plus circle'
            content='add comment'
            onClick={ onAddCommentClick }
          />
        </Comment>          
      }
    </Group>
  );
};