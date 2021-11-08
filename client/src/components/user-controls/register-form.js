import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { useModal } from '../../hooks';
import { AutoFocusForm } from '../auto-focus-form';

export const RegisterForm = props => {
  const [open, onOpen, onClose] = useModal();

  // XXX: Need registerErrorMessage from user.js
  const registerErrorMessage = null;

  const onSubmit = () => {
    /*
    const submitRegister = () => {
      const { regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword } = this.state;
      this.props.onRegister(regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword);
    }
    */
  };

  const onChange = () => {
    //const handleChange = (e, { name, value }) => this.setState({ [name]: value })
  };

  return (
    <Modal
      size='tiny'
      trigger={ <Menu.Item content='Register'/> }
      open={ open }
      onOpen={ onOpen }
      onClose={ onClose }
    >
      <Modal.Header>Register new user</Modal.Header>
      <Modal.Content>
        <AutoFocusForm error onSubmit={ onSubmit }>
          <Form.Input label='Enter a login name' name='regModalUsername' onChange={ onChange } />
          <Form.Input label='Enter email address' name='regModalEmail' onChange={ onChange } />
          <Form.Input label='Enter first name' name='regModalFirstname' onChange={ onChange } />
          <Form.Input label='Enter last name' name='regModalLastname' onChange={ onChange } />
          <Form.Input label='Enter a password' type='password' name='regModalPassword'  onChange={ onChange } />
          <Message
            error
            content={ registerErrorMessage }
          />
          <div style={{ display: 'none' }}>
            <Form.Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={ onClose }>
          Cancel
        </Button>
        <Button color='green' onClick={ onSubmit }>
          Register
        </Button>
      </Modal.Actions>
    </Modal>
  );
};