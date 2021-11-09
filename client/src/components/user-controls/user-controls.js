import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { checkLogin } from '../../api';
import { AutoFocusForm } from '../auto-focus-form';
import { RegisterForm } from './register-form';
import { LoginForm } from './login-form';

export const UserControls = props => {
  const history = useHistory();

  useEffect(() => {
    const checkUserLogin = async () => {
      try {
        const user = await checkLogin();

        if (user) {
          console.log(user);
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

  const logout = () => {
    this.props.onLogout();
    history.push('/');
  }

  const { login, loginErrorMessage, onCloseLoginModal, loginModalOpen,
    registerErrorMessage, onCloseRegisterModal, registerModalOpen } = props;
  
  return (
    <Menu.Menu position='right'>
      { login ? 
        <>
          <Menu.Item content={ login } />
          <Menu.Item content='Log out' onClick={ this.logout } />
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
