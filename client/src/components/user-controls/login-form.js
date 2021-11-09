import React, { useEffect, useContext, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { LOGIN, UserContext } from '../../contexts';
import { AutoFocusForm } from '../auto-focus-form';
import { api } from '../../api';
import { useModal } from '../../hooks';

export const LoginForm = () => {
  const [{ login }, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [values, setValues] = useState({
    username: null,
    password: null
  });
  const [errorMessage, setErrorMessage] = useState(null);

  const onOpenModal = () => {
    setErrorMessage();
    openModal();
  };

  const onSubmit = async () => {
    const { username, password } = values;

    try {
      const user = await api.login(username, password);

      userDispatch({
        type: LOGIN,
        id: user._id,
        login: user.login,
        admin: user.admin
      });

      closeModal();
    }
    catch (error) {
      console.log(error);      

      setErrorMessage(error.response.data.message);
    }

    /*
    const submitLogin = () => {
      const { loginModalUsername, loginModalPassword } = this.state;
      this.props.onLogin(loginModalUsername, loginModalPassword);
    }
    */
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
      trigger={ <Menu.Item content='Log in'/> }
      open={ open}
      onOpen={ onOpenModal }
      onClose={ closeModal }
    >
      <Modal.Header>Log in</Modal.Header>
      <Modal.Content>
        <AutoFocusForm error onSubmit={ onSubmit }>
          <Form.Input label='Login or email' name='loginModalUsername' onChange={ onChange } />
          <Form.Input label='Password' type='password' name='loginModalPassword' onChange={ onChange } />
          <Message
            error
            content={ errorMessage }
          />
          <div style={{display: 'none'}}>
            <Form.Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={ closeModal }>
          Cancel
        </Button>
        <Button color='green' onClick={ onSubmit }>
          Log in
        </Button>
      </Modal.Actions>
    </Modal>
  );
};
