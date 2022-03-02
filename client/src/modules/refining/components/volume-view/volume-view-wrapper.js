import { useContext, useState, useRef, useEffect } from 'react';
import { DataContext, ControlsContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView, onLoaded }) => {
  const [{ maskData, label }] = useContext(DataContext);
  const [{ showBackground }] = useContext(ControlsContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const { width } = useResize(div);

  // Initialize
  useEffect(() => {
    if (!initialized && div.current && width) { 
      volumeView.initialize(div.current);
      setInitialized(true);
    }
  }, [initialized, div, width, volumeView]);

  // Update data
  useEffect(() => {
    if (initialized && maskData) {
      volumeView.setLabel(label);
      volumeView.setData(maskData, onLoaded);
    }
  }, [initialized, volumeView, maskData, label, onLoaded]);   

  // Show background
  useEffect(() => {
    if (initialized) {
      volumeView.setShowBackground(showBackground);
      volumeView.render();
    }
  }, [initialized, volumeView, showBackground]);

  // Clean up
  useEffect(() => {
    return () => volumeView.cleanUp();
  }, [volumeView]);

  return (
    <div ref={ div } style={{ height: width }}></div>
  );
};