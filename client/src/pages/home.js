import { useContext } from 'react';
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
            <>Unknown assignment type { assignment.type }</>
      : 
        <AssignmentSelection />
      }
    </>
  );
};