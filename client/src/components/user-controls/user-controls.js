import React, { useEffect, useContext } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { LOGIN, LOGOUT, UserContext } from '../../contexts';
import { AutoFocusForm } from '../auto-focus-form';
import { RegisterForm } from './register-form';
import { LoginForm } from './login-form';
import { api } from '../../api';

export const UserControls = props => {
  const [{ login }, userDispatch] = useContext(UserContext);
  const history = useHistory();

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
/*    
    props.fetchLoginStatus().then(() => {
      if (props.onInitialized) {
        props.onInitialized();
      }
    });
*/    
  }, []);

  const openLoginModal = () => {
    this.setState({
      loginModalUsername: null,
      loginModalPassword: null,
    })
    this.props.onOpenLoginModal();
    this.opening = true;
  }

  const submitRegister = () => {
    const { regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword } = this.state;
    this.props.onRegister(regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword);
  }

  const openRegisterModal = () => {
    this.setState({
      regModalUsername: null,
      regModalEmail: null,
      regModalFirstname: null,
      regModalLastname: null,
      regModalPassword: null,
    })
    this.props.onOpenRegisterModal();
    this.opening = true;
  }

  const onLogout = async () => {
    await api.logout();

    userDispatch({
      type: LOGOUT
    });
    /*
    this.props.onLogout();
    history.push('/');
    */
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
