import { useContext } from 'react';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';

export const Select = () => {
  const [{ user }] = useContext(UserContext);

  return (
    !user ? 
      <Message>No user</Message>
    : 
      <AssignmentSelection />
  );
};