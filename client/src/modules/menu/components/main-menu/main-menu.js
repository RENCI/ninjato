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
      { user?.reviewer &&
        <Item 
          as={ Link } 
          to='/administration' 
          content='Administration'
          icon='users'
          active={ location.pathname === '/administration' } 
          disabled={ !user?.reviewer }
        />
      }
      <Item 
        as={ Link } 
        to='/select' 
        content='Select'
        icon='clipboard list'
        active={ location.pathname === '/select' } 
        disabled={ !user }
      />
      <Item 
        as={ Link } 
        to='/assignment' 
        content='Edit'
        icon='edit'
        active={ location.pathname === '/assignment' } 
        disabled={ !assignment }
      />
      <Menu.Menu position='right'>
        <UserControls />
      </Menu.Menu>
    </Menu>
  );
};
