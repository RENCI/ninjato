import { useContext } from 'react';
import { Message, Dimmer, Icon } from 'semantic-ui-react';
import { ErrorContext, CLEAR_ERROR } from 'contexts';

const { Header, Content } = Message;

export const ErrorMessage = () => {
  const [{ error }, dispatch] = useContext(ErrorContext);

  const onDismiss = () => {
    dispatch({ type: CLEAR_ERROR });
  };

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
        <Content>
          <Header>Error</Header>
          { error }
        </Content>
      </Message>
    </Dimmer>
  );
};
