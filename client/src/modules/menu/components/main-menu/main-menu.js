import { Container, Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { UserControls } from 'modules/menu/components/user-controls';

const { Item } = Menu;

export const MainMenu = () => (
  <Menu stackable borderless inverted attached size='large'>
    <Container>
      <Item as={ Link } to='/' header>
        <img alt="logo" src='logo192.png' />
        ninjatō
      </Item>
      <Menu borderless inverted floated='right'>
        <UserControls />
      </Menu>
    </Container>
  </Menu>
);
