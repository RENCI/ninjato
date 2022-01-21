import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView }) => {
  const [{ maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const { width } = useResize(outerDiv);

  // Initialize
  useEffect(() => {
    if (vtkDiv.current && width) { 
      volumeView.initialize(vtkDiv.current);
    }
  }, [vtkDiv, width, volumeView]);

  // Update data
  useEffect(() => {
    if (vtkDiv.current && width && maskData) {
      volumeView.setData(maskData);
    }
  }, [vtkDiv, width, volumeView, maskData]);   

  // Clean up
  useEffect(() => {
    return () => volumeView.cleanUp();
  }, [volumeView]);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};