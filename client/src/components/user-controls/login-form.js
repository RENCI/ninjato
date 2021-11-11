import React, { useContext, useState } from 'react';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { 
  LOGIN, SET_ASSIGNMENT, UserContext,
  SET_DATA, DataContext
 } from '../../contexts';
import { AutoFocusForm } from '../auto-focus-form';
import { api } from '../../api';
import { useModal } from '../../hooks';

export const LoginForm = () => {
  const [, userDispatch] = useContext(UserContext);
  const [, dataDispatch] = useContext(DataContext);
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

      const id = user._id;

      userDispatch({
        type: LOGIN,
        id: id,
        login: user.login,
        admin: user.admin
      });

      const assignment = await api.getAssignment(id);

      userDispatch({
        type: SET_ASSIGNMENT,
        ...assignment
      });

      const data = await api.getData(assignment.imageId, assignment.maskId);

      dataDispatch({
        type: SET_DATA,
        ...data
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
      trigger={ <Menu.Item content='Log in'/> }
      open={ open}
      onOpen={ onOpenModal }
      onClose={ closeModal }
    >
      <Modal.Header>Log in</Modal.Header>
      <Modal.Content>
        <AutoFocusForm error onSubmit={ onSubmit }>
          <Form.Input label='Login or email' name='username' onChange={ onChange } />
          <Form.Input label='Password' type='password' name='password' onChange={ onChange } />
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
