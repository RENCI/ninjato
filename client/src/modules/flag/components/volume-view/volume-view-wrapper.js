import { useContext, useState, useRef, useEffect } from 'react';
import { DataContext, FlagContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView, onLoaded }) => {
  const [{ maskData, label }] = useContext(DataContext);
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
      volumeView.setLabel(label);
      volumeView.setData(maskData, onLoaded);
    }
  }, [initialized, volumeView, maskData, label, onLoaded]);   

  // Flag
  useEffect(() => {
    if (initialized) {
      if (flag) {
        volumeView.setLinks(links);
        volumeView.render();
      }
      else {
        volumeView.setHighlightLabel(null);
        volumeView.setLinks([]);
        volumeView.render();
      }
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