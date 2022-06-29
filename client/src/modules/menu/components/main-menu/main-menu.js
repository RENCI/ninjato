import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'semantic-ui-react';
import { UserControls } from 'modules/menu/components/user-controls';

const { Item } = Menu;

export const MainMenu = () => {
  const location = useLocation();

  return (
    <Menu borderless inverted attached>
      <Item as={ Link } to='/' header active={ location.pathname === '/' }>
        <img alt="logo" src='logo192.png' />
        ninjatō
      </Item>
      <Item as={ Link } to='/select' active={ location.pathname === '/select' }>
        Select assignment
      </Item>
      <Item as={ Link } to='/assignment' active={ location.pathname === '/assignment' }>
        Current assignment
      </Item>
      <Menu.Menu position='right'>
        <UserControls />
      </Menu.Menu>
    </Menu>
  );
};
