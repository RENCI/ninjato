import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';
import { sliceView } from './slice-view';

export const SliceViewWrapper = () => {
  const [{ imageData, maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const { width } = useResize(outerDiv);

  useEffect(() => {
    if (vtkDiv.current && width && imageData && maskData) { 
      sliceView.initialize(vtkDiv.current, imageData, maskData);
    }
  }, [vtkDiv, width, imageData, maskData]);

/*
  // Initialize
  useEffect(() => {
    if (vtkDiv.current) {      
      console.log("initialize");
      sliceView.initialize(vtkDiv.current);
    }
  }, [vtkDiv]);

  // Update data
  useEffect(() => {
    if (vtkDiv.current && imageData && maskData) {

      console.log("setData");
      sliceView.setData(imageData, maskData);
    }
  }, [vtkDiv, imageData, maskData]);   
*/     

  // Clean up
  useEffect(() => {
    //return () => sliceView.cleanUp();
  }, []);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};