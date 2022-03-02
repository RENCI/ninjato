import { Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import { UserControls } from 'modules/menu/components/user-controls';

const { Item } = Menu;

export const MainMenu = () => (
  <Menu borderless inverted attached>
    <Item as={ Link } to='/' header>
      <img alt="logo" src='logo192.png' />
      ninjatō
    </Item>
    <Menu.Menu position='right'>
      <UserControls />
    </Menu.Menu>
  </Menu>
);
