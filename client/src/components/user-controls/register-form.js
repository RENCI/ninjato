import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { useModal } from '../../hooks';
import { AutoFocusForm } from '../auto-focus-form';

export const RegisterForm = () => {
  const [open, onOpen, onClose] = useModal();
  const [values, setValues] = useState({
    username: null,
    email: null,
    firstname: null,
    lastname: null,
    password: null
  });

  // XXX: Need registerErrorMessage from user.js
  const registerErrorMessage = null;

  const onSubmit = () => {
    const { username, email, firstname, lastname, password } = values;

    // XXX: Do dispatch
    /*
    const submitRegister = () => {
      const { regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword } = this.state;
      this.props.onRegister(regModalUsername, regModalEmail, regModalFirstname, regModalLastname, regModalPassword);
    }
    */
  };

  const onChange = (evt, { name, value }) => {
    setValues({
      ...values,
      [name]: value
    });
  };

  console.log(values);

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
          <Form.Input label='Enter a login name' name='username' onChange={ onChange } />
          <Form.Input label='Enter email address' name='email' onChange={ onChange } />
          <Form.Input label='Enter first name' name='firstname' onChange={ onChange } />
          <Form.Input label='Enter last name' name='lastname' onChange={ onChange } />
          <Form.Input label='Enter a password' type='password' name='password'  onChange={ onChange } />
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