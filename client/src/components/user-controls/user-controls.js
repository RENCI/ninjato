import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { AutoFocusForm } from '../auto-focus-form';
import { RegisterForm } from './RegisterForm';
import { LoginForm } from './LoginForm';

export const UserControls = props => {
  const history = useHistory();

  useEffect(() => {
    props.fetchLoginStatus().then(() => {
      if (props.onInitialized) {
        props.onInitialized();
      }
    });
  }, []);

  submitLogin = () => {
    const { loginModalUsername, loginModalPassword } = this.state;
    this.props.onLogin(loginModalUsername, loginModalPassword);
  }

  openLoginModal = () => {
    this.setState({
      loginModalUsername: null,
      loginModalPassword: null,
    })
    this.props.onOpenLoginModal();
    this.opening = true;
  }

  submitRegister = () => {
    const { regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword } = this.state;
    this.props.onRegister(regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword);
  }

  openRegisterModal = () => {
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

  handleChange = (e, { name, value }) => this.setState({ [name]: value })

  logout = () => {
    this.props.onLogout();
    history.push('/');
  }

  render() {
    const { login, loginErrorMessage, onCloseLoginModal, loginModalOpen,
      registerErrorMessage, onCloseRegisterModal, registerModalOpen } = this.props;
    if (login) {
      return (
        <Menu.Menu position='right'>
          <Menu.Item content={ login } />
          <Menu.Item content='Log out' onClick={ this.logout } />
        </Menu.Menu>
      );
    }
    return (
      <Menu.Menu position='right'>
        <RegisterForm />
        <LoginForm />              
      </Menu.Menu>
    );
  };
};
