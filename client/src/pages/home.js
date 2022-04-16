import { useContext } from 'react';
import { DataContext, UserContext } from 'contexts';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';
import { RefineContainer } from 'modules/refine/components/refine-container';
import { FlagContainer } from 'modules/flag/components/flag-container';

export const Home = () => {
  const [{ id, assignment }] = useContext(UserContext);
  const [{ imageData }] = useContext(DataContext);

  return (
    <>
      { !id ? null
      : imageData ? 
          assignment.type === 'flag' ? 
            <FlagContainer /> :
            <RefineContainer />        
      : 
        <AssignmentSelection />
      }
    </>
  );
};