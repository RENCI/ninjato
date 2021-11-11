import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'semantic-ui-react';
import { 
  LOGIN, LOGOUT, UserContext,
  CLEAR_DATA, DataContext 
} from '../../contexts';
import { RegisterForm } from './register-form';
import { LoginForm } from './login-form';
import { api } from '../../api';

export const UserControls = () => {
  const [{ login }, userDispatch] = useContext(UserContext);
  const [, dataDispatch] = useContext(DataContext);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        const user = await api.checkLogin();

        if (user) {
          userDispatch({
            type: LOGIN,
            id: user._id,
            login: user.login,
            admin: user.admin
          });
        }
      }
      catch (error) {
        console.log(error);
      }
    };

    checkUserLogin();    
  }, [userDispatch]);

  const onLogout = async () => {
    await api.logout();

    userDispatch({
      type: LOGOUT
    });

    dataDispatch({
      type: CLEAR_DATA
    });

    navigate('/');
  }
  
  return (
    <Menu.Menu position='right'>
      { login ? 
        <>
          <Menu.Item content={ login } />
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
