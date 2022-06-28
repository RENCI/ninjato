import { useContext } from 'react';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RefineContainer } from 'modules/refine/components/refine-container';

export const Assignment = () => {
  const [{ assignment }] = useContext(UserContext);

  return (
    !assignment ? 
      <Message>No assignment</Message> 
    : assignment.type === 'refine' ? 
      <RefineContainer />
    : 
      <Message>Unknown assignment type { assignment.type }</Message>
  );
};