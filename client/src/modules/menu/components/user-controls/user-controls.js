import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'semantic-ui-react';
import { UserContext, LOGIN, LOGOUT } from 'contexts';
import { RegisterForm } from './register-form';
import { LoginForm } from './login-form';
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
      { user ? 
        <>
          <Menu.Item content={ user.login } />
          <Menu.Item content='Log out' onClick={ onLogout } />
        </>
      :
        <>
          <RegisterForm />
          <LoginForm /> 
        </>
      }             
    </Menu.Menu>
  );
};
