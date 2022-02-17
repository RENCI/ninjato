import { useContext, useState } from 'react';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { LOGIN, UserContext } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { api } from 'utils/api';
import { useModal, useGetAssignment } from 'hooks';
import styles from './styles.module.css';

const { Header, Content, Actions } = Modal;

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

    closeModal();

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
      trigger={ <Menu.Item content='Log in' /> }
      open={ open }
      onOpen={ onOpenModal }
      onClose={ closeModal }
    >
      <Header>Log in</Header>
      <Content>
        <AutoFocusForm 
          error 
          onSubmit={ onSubmit }
        >
          <Form.Input label='Login or email' name='username' onChange={ onChange } />
          <Form.Input label='Password' type='password' name='password' onChange={ onChange } />
          <Message
            error
            content={ errorMessage }
          />
          <div className={ styles.hide }>
            <Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Content>
      <Actions>
        <Button onClick={ closeModal }>
          Cancel
        </Button>
        <Button primary onClick={ onSubmit }>
          Log in
        </Button>
      </Actions>
    </Modal>
  );
};
