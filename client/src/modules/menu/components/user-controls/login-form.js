import { useContext, useState } from 'react';
import { Modal, Button, Form, Menu, Message } from 'semantic-ui-react';
import { LOGIN, UserContext } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { api } from 'utils/api';
import { useModal } from 'hooks';
import styles from './styles.module.css';

const { Header, Content, Actions } = Modal;
const { Input } = Form;

export const LoginForm = () => {
  const [, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [values, setValues] = useState({
    username: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState(null);

  const onOpenModal = () => {
    setErrorMessage();
    openModal();
  };

  const onSubmit = async () => {
    const { username, password } = values;

    setErrorMessage();

    try {
      const user = await api.login(username, password);

      const id = user._id;

      userDispatch({
        type: LOGIN,
        id: id,
        login: user.login,
        admin: user.admin
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
          <Input label='Login or email' name='username' onChange={ onChange } />
          <Input label='Password' type='password' name='password' onChange={ onChange } />
          <Message
            error
            content={ errorMessage }
          />
          <div className={ styles.hide }>
            <Button>
              Submit
            </Button>
          </div>
        </AutoFocusForm>
      </Content>
      <Actions>
        <Button onClick={ closeModal }>
          Cancel
        </Button>
        <Button 
          primary 
          disabled={ values.username === '' || values.password === ''}
          onClick={ onSubmit }
        >
          Log in
        </Button>
      </Actions>
    </Modal>
  );
};
