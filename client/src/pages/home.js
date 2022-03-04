import { useContext } from 'react';
import { DataContext } from 'contexts';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';
import { RefineContainer } from 'modules/refine/components/refine-container';

export const Home = () => {
  const [{ imageData }] = useContext(DataContext);

  return (
    <>
      { imageData ? 
        <RefineContainer />        
      : 
        <AssignmentSelection />
      }
    </>
  );
};