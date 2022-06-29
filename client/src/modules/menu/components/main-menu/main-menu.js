import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { UserControls } from 'modules/menu/components/user-controls';
import { useContext } from 'react';

const { Item } = Menu;

export const MainMenu = () => {
  const [{ user, assignment }] = useContext(UserContext);
  const location = useLocation();

  return (
    <Menu borderless inverted attached>
      <Item 
        header
        as={ Link } 
        to='/' 
        active={ location.pathname === '/' }
      >
        <img alt="logo" src='logo192.png' />
        ninjatō
      </Item>
      <Item 
        as={ Link } 
        to='/select' 
        active={ location.pathname === '/select' } 
        disabled={ !user }
      >
        Select assignment
      </Item>
      <Item 
        as={ Link } 
        to='/assignment' 
        active={ location.pathname === '/assignment' } 
        disabled={ !assignment }
      >
        Current assignment
      </Item>
      <Menu.Menu position='right'>
        <UserControls />
      </Menu.Menu>
    </Menu>
  );
};
