import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const { width } = useResize(outerDiv);
  
  // Initialize
  useEffect(() => {
    if (vtkDiv.current && width) { 
      sliceView.initialize(vtkDiv.current);
    }
  }, [vtkDiv, width, sliceView]);

  // Update data
  useEffect(() => {
    if (vtkDiv.current && width && imageData && maskData) {
      sliceView.setData(imageData, maskData);
    }
  }, [vtkDiv, width, sliceView, imageData, maskData]);   

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};