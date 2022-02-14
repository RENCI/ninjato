import { useContext, useState } from 'react';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { LOGIN, UserContext } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { api } from 'utils/api';
import { useModal, useGetAssignment } from 'hooks';
import styles from './styles.module.css';

export const LoginForm = () => {
  const [, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const getAssignment = useGetAssignment();
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

      getAssignment(id);

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
          <div className={ styles.hide }>
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
