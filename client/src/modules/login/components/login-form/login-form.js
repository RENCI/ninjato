import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form, Message } from 'semantic-ui-react';
import { LOGIN, UserContext } from 'contexts';
import { AutoFocusForm } from 'modules/common/components/auto-focus-form';
import { api } from 'utils/api';
import { useModal } from 'hooks';
import styles from './styles.module.css';

const { Header, Content, Actions } = Modal;
const { Input } = Form;

export const LoginForm = ({ trigger,  }) => {
  const [, userDispatch] = useContext(UserContext);
  const navigate = useNavigate();
  const [open, openModal, closeModal] = useModal();
  const [values, setValues] = useState({
    username: '',
    password: ''
  });
  const [success, setSuccess] = useState();
  const [errorMessage, setErrorMessage] = useState();

  const onOpenModal = () => {
    setSuccess();
    setErrorMessage();
    openModal();
  };

  const onSubmit = async () => {
    const { username, password } = values;

    setErrorMessage();

    try {
      const user = await api.login(username, password);

      setSuccess(true);
      setTimeout(() => {
        userDispatch({
          type: LOGIN,
          user: user
        });

        setSuccess();
        closeModal();
        navigate('/select');
      }, 1000);      
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
      trigger={ trigger }
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
            hidden={ !success && !errorMessage}
            positive={ success ? true : false }
            error={ errorMessage ? true : false }
            content={ success ? 'Success!' : errorMessage ? errorMessage : null }
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
