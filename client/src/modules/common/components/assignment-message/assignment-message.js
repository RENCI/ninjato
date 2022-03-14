import { Message } from 'semantic-ui-react';

export const AssignmentMessage = ({ children }) => {
  return (
    <Message attached style={{ textAlign: 'center' }}>
      { children }
    </Message>
  );
};