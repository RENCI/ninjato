import { useContext } from 'react';
import { DataContext } from 'contexts';
import { AssignmentSelection } from 'components/assignment-selection';
import { VisualizationContainer } from 'components/visualization-container';

export const Home = () => {
  const [{ imageData }] = useContext(DataContext);

  return (
    <>
      { imageData ? 
        <VisualizationContainer />        
      : 
        <AssignmentSelection />
      }
    </>
  );
};