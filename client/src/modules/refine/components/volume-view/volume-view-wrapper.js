import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, RefineContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView, onLoaded }) => {
  const [{ maskData, assignment }] = useContext(UserContext);
  const [{ activeLabel, showBackground }] = useContext(RefineContext);
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

  // Labels
  useEffect(() => {
    if (initialized) {
      const labels = assignment.regions.map(({ label }) => label);

      volumeView.setLabels(labels);
    }
  }, [initialized, volumeView, assignment]); 

  // Data
  useEffect(() => {
    if (initialized && maskData) {
      volumeView.setData(maskData);
      volumeView.render(onLoaded);
    }
  }, [initialized, volumeView, maskData]);   

  // Active label
  useEffect(() => {
    if (initialized) volumeView.setActiveLabel(activeLabel);
  }, [initialized, activeLabel]);

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