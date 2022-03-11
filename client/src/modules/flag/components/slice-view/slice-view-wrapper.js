import { useContext, useState, useRef, useEffect } from 'react';
import { DataContext, FlagContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, label }] = useContext(DataContext);
  const [{ flag, links }] = useContext(FlagContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const { width } = useResize(div);
  
  // Initialize
  useEffect(() => {
    if (!initialized && div.current && width) { 
      sliceView.initialize(div.current);
      setInitialized(true);
    }
  }, [initialized, div, width, sliceView]);

  // Update data
  useEffect(() => {
    if (initialized && imageData && maskData) {
      sliceView.setLabel(label);
      sliceView.setData(imageData, maskData);
    }
  }, [initialized, sliceView, imageData, maskData, label]);

  // Flag
  useEffect(() => {
    if (initialized) {
      sliceView.setFlag(flag);

      if (!flag) sliceView.setHighlightLabel(null);      

      sliceView.render();
    }
  }, [initialized, sliceView, flag]);

  // Links
  useEffect(() => {
    if (initialized) {
      sliceView.setLinks(links);
    }
  }, [initialized, sliceView, links]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};