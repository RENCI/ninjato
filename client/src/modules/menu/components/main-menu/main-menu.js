import { Container, Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { UserControls } from 'modules/menu/components/user-controls';

export const MainMenu = () => (
  <Menu stackable borderless inverted attached size='large'>
    <Container>
      <Menu.Item as={ Link } to='/' header content='ninjatō'></Menu.Item>
      <Menu borderless inverted floated='right'>
        <UserControls />
      </Menu>
    </Container>
  </Menu>
);
