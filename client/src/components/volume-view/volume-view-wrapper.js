import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';
import { VolumeView } from './volume-view';

export const VolumeViewWrapper = () => {
  const [{ maskData }] = useContext(DataContext);
  const outerDiv = useRef(null);
  const vtkDiv = useRef(null);
  const volumeView = useRef(VolumeView());
  const { width } = useResize(outerDiv);

  // Initialize
  useEffect(() => {
    if (vtkDiv.current && width) { 
      volumeView.current.initialize(vtkDiv.current);
    }
  }, [vtkDiv, width]);

  // Update data
  useEffect(() => {
    if (vtkDiv.current && width && maskData) {
      volumeView.current.setData(maskData);
    }
  }, [vtkDiv, width, maskData]);   

  // Clean up
  useEffect(() => {
    return () => volumeView.current.cleanUp();
  }, []);

  return (
    <div ref={ outerDiv } style={{ height: width }}>
      <div ref={ vtkDiv } />
    </div>
  );
};