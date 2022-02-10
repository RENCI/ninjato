import { useContext } from 'react';
import { Message, Dimmer, Icon } from 'semantic-ui-react';
import { ErrorContext, CLEAR_ERROR } from 'contexts';

const { Header, Content } = Message;

export const ErrorMessage = () => {
  const [{ error }, dispatch] = useContext(ErrorContext);

  const onDismiss = () => {
    dispatch({ type: CLEAR_ERROR });
  };
  
if (error) console.log(error.messages);

  const text = !error ? null :
    (typeof error === 'string' || error instanceof String) ? error :
    error.message ? error.message.split(`\n`).map(s => <p>{ s }</p>) :
    JSON.stringify(error, Object.getOwnPropertyNames(error));

    console.log(text);

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