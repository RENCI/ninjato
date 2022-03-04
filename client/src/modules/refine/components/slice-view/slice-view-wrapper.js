import { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { DataContext, RefineContext, SET_EDIT_MODE } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, label }] = useContext(DataContext);
  const [
    { editMode, editModes, brushes, paintBrush, eraseBrush }, 
    controlsDispatch
  ] = useContext(RefineContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const { width } = useResize(div);

  const onKeyDown = useCallback(evt => {
    if (evt.key === 'Control') {
      controlsDispatch({ type: SET_EDIT_MODE, mode: 'erase' });
    }
  }, [controlsDispatch]);

  const onKeyUp = useCallback(evt => {
    if (evt.key === 'Control') {
      controlsDispatch({ type: SET_EDIT_MODE, mode: 'paint' });
    }
  }, [controlsDispatch]);
  
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

  // Paint brush
  useEffect(() => {
    if (initialized) sliceView.setPaintBrush(brushes[paintBrush]);
  }, [initialized, sliceView, brushes, paintBrush]);

  // Erase brush
  useEffect(() => {
    if (initialized) sliceView.setEraseBrush(brushes[eraseBrush]);
  }, [initialized, sliceView, brushes, eraseBrush]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};