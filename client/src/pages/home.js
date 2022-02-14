import { useContext } from 'react';
import { DataContext } from 'contexts';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';
import { RefiningContainer } from 'modules/refining/components/refining-container';

export const Home = () => {
  const [{ imageData }] = useContext(DataContext);

  return (
    <>
      { imageData ? 
        <RefiningContainer />        
      : 
        <AssignmentSelection />
      }
    </>
  );
};