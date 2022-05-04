import { useContext } from 'react';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';
import { RefineContainer } from 'modules/refine/components/refine-container';

export const Home = () => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ imageData }] = useContext(UserContext);

  return (
    <>
      { !id ? null
      : imageData ? 
          assignment.type === 'refine' ? 
            <RefineContainer />
          : 
            <Message>Unknown assignment type { assignment.type }</Message>
      : 
        <AssignmentSelection />
      }
    </>
  );
};