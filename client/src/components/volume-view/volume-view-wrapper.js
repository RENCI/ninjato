import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';
import { volumeView } from './volume-view';

export const VolumeViewWrapper = () => {
  const [{ maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const { width } = useResize(outerDiv);

  // Initialize
  useEffect(() => {
    if (vtkDiv.current && width) { 
      volumeView.initialize(vtkDiv.current);
    }
  }, [vtkDiv, width]);

  // Update data
  useEffect(() => {
    if (vtkDiv.current && width && maskData) {
      volumeView.setData(maskData);
    }
  }, [vtkDiv, width, maskData]);   

  // Clean up
  useEffect(() => {
    return () => volumeView.cleanUp();
  }, []);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};