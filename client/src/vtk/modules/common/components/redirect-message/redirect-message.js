import { Header, Segment } from 'semantic-ui-react';

export const RedirectMessage = ({ message }) => { 
  return (      
    <Segment 
      basic 
      textAlign='center'
    >
      <Header
        content={ message }
        subheader='Redirecting'
      />
    </Segment>
  );
};
