import { useContext } from 'react';
import { Button, Modal, Tab, Comment } from 'semantic-ui-react';
import { UserContext } from 'contexts';

const { Header, Content } = Modal;

export const CommentContainer = () => {
  const [{ assignment }, userDispatch] = useContext(UserContext);

  return (
    <Modal
      basic
      dimmer='blurring'
      trigger={ <Button icon='comments outline' /> }
    >
      <Header>Comments</Header>
      <Content>
        <Tab 
          menu={{ secondary: true, pointing: true }} 
          panes={ assignment.regions.map(({ label, comments }) => (
            { 
              menuItem: label,
              render: () => 'Comments!'
            } 
          ))}
        />
      </Content>
    </Modal>
  );
};