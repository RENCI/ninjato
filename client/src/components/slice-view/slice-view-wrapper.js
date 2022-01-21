import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';
import { sliceView } from './slice-view';

export const SliceViewWrapper = ({ onEdit }) => {
  const [{ imageData, maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const { width } = useResize(outerDiv);
  
  // Initialize
  useEffect(() => {
    if (vtkDiv.current && width) { 
      sliceView.initialize(vtkDiv.current, onEdit);
    }
  }, [vtkDiv, width, onEdit]);

  // Update data
  useEffect(() => {
    if (vtkDiv.current && width && imageData && maskData) {
      sliceView.setData(imageData, maskData);
    }
  }, [vtkDiv, width, imageData, maskData]);   

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, []);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};