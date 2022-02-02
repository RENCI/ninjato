import { useContext, useRef, useEffect } from 'react';
import { DataContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView, onLoaded }) => {
  const [{ maskData, label }] = useContext(DataContext);
  const div = useRef(null);
  const { width } = useResize(div);

  // Initialize
  useEffect(() => {
    if (div.current && width) { 
      volumeView.initialize(div.current);
    }
  }, [div, width, volumeView]);

  // Update data
  useEffect(() => {
    if (div.current && width && maskData) {
      volumeView.setLabel(label);
      volumeView.setData(maskData, onLoaded);
    }
  }, [div, width, volumeView, maskData, label, onLoaded]);   

  // Clean up
  useEffect(() => {
    return () => volumeView.cleanUp();
  }, [volumeView]);

  return (
    <div ref={ div } style={{ height: width }}></div>
  );
};