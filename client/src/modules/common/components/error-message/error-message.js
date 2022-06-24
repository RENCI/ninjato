import { useContext } from 'react';
import { Message, Dimmer, Icon } from 'semantic-ui-react';
import { ErrorContext, CLEAR_ERROR } from 'contexts';

const { Header, Content } = Message;

const composeError = error => {
  if (!error) return null;

  const m1 = error.message;
  const m2 = error.response?.data?.message;

  if (typeof error === 'string' || error instanceof String) {
    return error;
  }
  else if (m1 || m2) {
    const split = (message, n) => message.split(`\n`).map((s, i) => <p key={ n + i }>{ s }</p>);

    let text = [];
    if (m1) text = text.concat(split(m1, text.length));
    if (m2) text = text.concat(split(m2, text.length));

    return text;
  }
  else {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  }
};

export const ErrorMessage = () => {
  const [{ error }, dispatch] = useContext(ErrorContext);

  const onDismiss = () => {
    dispatch({ type: CLEAR_ERROR });
  };
  
  const text = composeError(error);

  return (
    <Dimmer 
      page
      active={ error !== null }
    >
      <Message
        error
        icon
        onDismiss={ onDismiss }
      >
        <Icon name='exclamation circle' />
        <Content style={{ textAlign: 'left' }}>
          <Header>Error</Header>
          { text }
        </Content>
      </Message>
    </Dimmer>
  );
};