import { useContext, useState } from 'react';
import { Modal, Button, Form, Menu, Message } from 'semantic-ui-react';
import { LOGIN, UserContext } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { api } from 'utils/api';
import { useModal } from 'hooks';
import styles from './styles.module.css';

const { Header, Content, Actions } = Modal;
const { Input } = Form;

export const RegisterForm = () => {
  const [, userDispatch] = useContext(UserContext);
  const [open, openModal, closeModal] = useModal();
  const [values, setValues] = useState({
    username: '',
    email: '',
    firstname: '',
    lastname: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState(null);

  const onOpenModal = () => {
    setErrorMessage();
    openModal();
  };

  const onSubmit = async () => {
    const { username, email, firstname, lastname, password } = values;

    setErrorMessage();

    try {
      const user = await api.register(username, email, firstname, lastname, password);

      userDispatch({
        type: LOGIN,
        user: user
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
      <Header>Register new user</Header>
      <Content>
        <AutoFocusForm 
          error 
          onSubmit={ onSubmit }
        >
          <Input label='Enter a login name' name='username' onChange={ onChange } />
          <Input label='Enter email address' name='email' onChange={ onChange } />
          <Input label='Enter first name' name='firstname' onChange={ onChange } />
          <Input label='Enter last name' name='lastname' onChange={ onChange } />
          <Input label='Enter a password' type='password' name='password'  onChange={ onChange } />
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
        <Button 
          primary
          disabled={ Object.values(values).reduce((blank, value) => blank || value === '', false) } 
          onClick={ onSubmit }
        >
          Register
        </Button>
      </Actions>
    </Modal>
  );
};