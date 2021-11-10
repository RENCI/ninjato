import React, { useContext, useState } from 'react';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { LOGIN, UserContext } from '../../contexts';
import { AutoFocusForm } from '../auto-focus-form';
import { api } from '../../api';
import { useModal } from '../../hooks';

export const RegisterForm = () => {
  const [, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [values, setValues] = useState({
    username: null,
    email: null,
    firstname: null,
    lastname: null,
    password: null
  });
  const [errorMessage, setErrorMessage] = useState(null);

  const onOpenModal = () => {
    setErrorMessage();
    openModal();
  };

  const onSubmit = async () => {
    const { username, email, firstname, lastname, password } = values;

    try {
      const user = await api.register(username, email, firstname, lastname, password);

      userDispatch({
        type: LOGIN,
        id: user._id,
        login: user.login,
        admin: false
      });

      closeModal();
    }
    catch (error) {
      console.log(error);      

      setErrorMessage(error.response.data.message);
    }
  };

  const onChange = (evt, { name, value }) => {
    setValues({
      ...values,
      [name]: value
    });
  };

  return (
    <Modal
      size='tiny'
      trigger={ <Menu.Item content='Register'/> }
      open={ open }
      onOpen={ onOpenModal }
      onClose={ closeModal }
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
            content={ errorMessage }
          />
          <div style={{ display: 'none' }}>
            <Form.Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={ closeModal }>
          Cancel
        </Button>
        <Button color='green' onClick={ onSubmit }>
          Register
        </Button>
      </Modal.Actions>
    </Modal>
  );
};