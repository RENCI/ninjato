import { Message, Dimmer, Icon } from 'semantic-ui-react';

const { Header, Content } = Message;

export const VolumeMessage = ({ header, message, onDismiss }) => {
  return (
    <Dimmer 
      page
      active={ message !== null }
    >
      <Message        
        info
        icon
        onDismiss={ onDismiss }
      >
        <Icon name='inbox' />
        <Content style={{ textAlign: 'left' }}>
          <Header>{ header }</Header>
          { message }
        </Content>
      </Message>
    </Dimmer>
  );
};