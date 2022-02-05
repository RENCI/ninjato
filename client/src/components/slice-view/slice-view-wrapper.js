import { useContext, useRef, useEffect, useCallback } from 'react';
import { DataContext, ControlsContext, SET_EDIT_MODE } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, label }] = useContext(DataContext);
  const [{ editMode }, controlsDispatch] = useContext(ControlsContext);
  const div = useRef(null);
  const { width } = useResize(div);

  const onKeyDown = useCallback(evt => {
    if (evt.key === 'Shift') {
      controlsDispatch({ type: SET_EDIT_MODE, mode: 'erase' });
    }
  }, [controlsDispatch]);

  const onKeyUp = useCallback(evt => {
    if (evt.key === 'Shift') {
      controlsDispatch({ type: SET_EDIT_MODE, mode: 'paint' });
    }
  }, [controlsDispatch]);
  
  // Initialize
  useEffect(() => {
    if (div.current && width) { 
      sliceView.initialize(div.current, onKeyDown, onKeyUp);
    }
  }, [div, width, sliceView, onKeyDown, onKeyUp]);

  // Update data
  useEffect(() => {
    if (div.current && width && imageData && maskData) {
      sliceView.setLabel(label);
      sliceView.setData(imageData, maskData);
    }
  }, [div, width, sliceView, imageData, maskData, label]);   

  // Edit mode
  useEffect(() => {
    sliceView.setEditMode(editMode);
  }, [sliceView, editMode]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};