import { useContext } from 'react';
import { DataContext } from 'contexts';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';
import { VisualizationContainer } from 'modules/common/components/visualization-container';

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