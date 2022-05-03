import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, FlagContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView, onLoaded }) => {
  const [{ maskData, label }] = useContext(UserContext);
  const [{ flag, links, showBackground }] = useContext(FlagContext);
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
      volumeView.setData(maskData);
      volumeView.setLabel(label);
      volumeView.render(onLoaded);
    }
  }, [initialized, volumeView, maskData, label, onLoaded]);   

  // Flag
  useEffect(() => {
    if (initialized) {
      volumeView.setFlag(flag);

      if (!flag) volumeView.setHighlightLabel(null);

      volumeView.render();
    }
  }, [initialized, volumeView, flag]);

  // Links
  useEffect(() => {
    if (initialized) {
      volumeView.setLinks(links);
      volumeView.render();
    }
  }, [initialized, volumeView, links]);

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