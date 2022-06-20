import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'semantic-ui-react';
import { UserContext, LOGIN, LOGOUT } from 'contexts';
import { RegisterForm } from './register-form';
import { LoginForm } from './login-form';
import { api } from 'utils/api';
import { useGetAssignments } from 'hooks';

export const UserControls = () => {
  const [{ login }, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();
  const getAssignment = useGetAssignments();

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        const user = await api.checkLogin();

        if (user) {
          const id = user._id;

          userDispatch({
            type: LOGIN,
            id: id,
            login: user.login,
            admin: user.admin
          });

          //getAssignment(id);
        }
      }
      catch (error) {
        console.log(error);
      }
    };

    if (!login) checkUserLogin();    
  }, [login, userDispatch, getAssignment]);

  const onLogout = async () => {
    await api.logout();

    userDispatch({
      type: LOGOUT
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
