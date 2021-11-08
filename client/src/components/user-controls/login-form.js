import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { useModal } from '../../hooks';
import { AutoFocusForm } from '../auto-focus-form';

export const LoginForm = props => {
  const [open, onOpen, onClose] = useModal();

  // XXX: Need loginErrorMessage from user.js
  const loginErrorMessage = null;

  const onSubmit = () => {
    /*
    const submitLogin = () => {
      const { loginModalUsername, loginModalPassword } = this.state;
      this.props.onLogin(loginModalUsername, loginModalPassword);
    }
    */
  };

  const onChange = () => {
    //const handleChange = (e, { name, value }) => this.setState({ [name]: value })
  };

  return (
    <Modal
      size='tiny'
      trigger={ <Menu.Item content='Log in'/> }
      open={ open}
      onOpen={ onOpen }
      onClose={ onClose }
    >
      <Modal.Header>Log in</Modal.Header>
      <Modal.Content>
        <AutoFocusForm error onSubmit={ onSubmit }>
          <Form.Input label='Login or email' name='loginModalUsername' onChange={ onChange } />
          <Form.Input label='Password' type='password' name='loginModalPassword' onChange={ onChange } />
          <Message
            error
            content={loginErrorMessage}
          />
          <div style={{display: 'none'}}>
            <Form.Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={ onClose }>
          Cancel
        </Button>
        <Button color='green' onClick={ onSubmit }>
          Log in
        </Button>
      </Modal.Actions>
    </Modal>
  );
};
