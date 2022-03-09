import { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { DataContext, FlagContext, SET_LINK_MODE } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, label }] = useContext(DataContext);
  const [{ linkMode, linkModes }, flagDispatch] = useContext(FlagContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const { width } = useResize(div);

  const onKeyDown = useCallback(evt => {
    if (evt.key === 'Control') {
      flagDispatch({ type: SET_LINK_MODE, mode: 'unlink' });
    }
  }, [flagDispatch]);

  const onKeyUp = useCallback(evt => {
    if (evt.key === 'Control') {
      flagDispatch({ type: SET_LINK_MODE, mode: 'link' });
    }
  }, [flagDispatch]);
  
  // Initialize
  useEffect(() => {
    if (!initialized && div.current && width) { 
      sliceView.initialize(div.current, onKeyDown, onKeyUp);
      setInitialized(true);
    }
  }, [initialized, div, width, sliceView, onKeyDown, onKeyUp]);

  // Update data
  useEffect(() => {
    if (initialized && imageData && maskData) {
      sliceView.setLabel(label);
      sliceView.setData(imageData, maskData);
    }
  }, [initialized, sliceView, imageData, maskData, label]);   

  // Link mode
  useEffect(() => {
    if (initialized) {
      const mode = linkModes.find(({ value }) => value === linkMode);
      sliceView.setLinkMode(linkMode, mode.cursor);
    }
  }, [initialized, sliceView, linkMode, linkModes]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};