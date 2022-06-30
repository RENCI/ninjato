import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Dropdown, Icon  } from 'semantic-ui-react';
import { UserContext, LOGIN, LOGOUT } from 'contexts';
import { api } from 'utils/api';

export const UserControls = () => {
  const [{ user }, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        const user = await api.checkLogin();

        if (user) {
          userDispatch({
            type: LOGIN,
            user: user
          });
        }
      }
      catch (error) {
        console.log(error);
      }
    };

    if (!user) checkUserLogin();    
  }, [user, userDispatch]);

  const onLogout = async () => {
    await api.logout();

    userDispatch({
      type: LOGOUT
    });

    navigate('/');
  }
  
  return (
    <Menu.Menu position='right'>
      { user && 
        <Dropdown item text={ <><Icon name='user' />{ user.login }</> }>
          <Dropdown.Menu>
            <Dropdown.Item content='Log out' icon='sign-out' onClick={ onLogout } />
          </Dropdown.Menu>
        </Dropdown>
      }             
    </Menu.Menu>
  );
};
