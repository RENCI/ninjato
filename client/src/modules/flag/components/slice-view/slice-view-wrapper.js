import { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { DataContext, FlagContext, FLAG_SET_EDIT_MODE } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, label }] = useContext(DataContext);
  const [{ editMode, editModes }, flagDispatch] = useContext(FlagContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const { width } = useResize(div);

  const onKeyDown = useCallback(evt => {
    if (evt.key === 'Control') {
      flagDispatch({ type: FLAG_SET_EDIT_MODE, mode: 'removeLink' });
    }
  }, [flagDispatch]);

  const onKeyUp = useCallback(evt => {
    if (evt.key === 'Control') {
      flagDispatch({ type: FLAG_SET_EDIT_MODE, mode: 'addLink' });
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

  // Edit mode
  useEffect(() => {
    if (initialized) {
      const mode = editModes.find(({ value }) => value === editMode);
      sliceView.setEditMode(editMode, mode.cursor);
    }
  }, [initialized, sliceView, editMode, editModes]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};