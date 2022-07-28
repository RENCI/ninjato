import { useContext } from 'react';
import { Modal, Dropdown } from 'semantic-ui-react';
import { UserContext } from 'contexts';

const { Header, Content } = Modal;

export const StatsContainer = ({ trigger }) => {
  const [{ user, assignments }] = useContext(UserContext);

  console.log(assignments);

  return (
    <Modal
      dimmer='blurring'
      trigger={ trigger }
    >
      <Header>Statistics for { user.login }</Header>
      <Content>
        Stats
      </Content>
    </Modal>
  );
};