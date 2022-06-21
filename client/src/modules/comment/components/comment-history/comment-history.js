import { Comment, Form, Button } from 'semantic-ui-react';

const { Group, Content, Author, Metadata, Text, Actions } = Comment;

export const CommentHistory = ({ comments }) => {

  comments = [
    { user: 'user 1', time: new Date(), comment: 'A comment'},
    { user: 'user 2', time: new Date(), comment: 'A comment'},
    { user: 'user 3', time: new Date(), comment: 'A comment'},
  ];

  return (
    <Group>
      { comments.map(({ user, time, comment }, i) => (
        <Comment key={ i }>
          <Content>
            <Author as='span'>{ user }</Author>
            <Metadata><div>{ time.toLocaleString() }</div></Metadata>
            <Text>{ comment }</Text>
          </Content>
        </Comment>
      ))}
      <Form reply>
        <Form.TextArea />
        <Button content='Add Comment' labelPosition='left' icon='edit' primary />
      </Form>
    </Group>
  );
};