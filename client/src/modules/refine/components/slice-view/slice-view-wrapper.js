import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, RefineContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, assignment }] = useContext(UserContext);
  const [{ editMode, editModes, brushes, paintBrush, eraseBrush }] = useContext(RefineContext);
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
      const labels = assignment.regions.map(({ label }) => label);

      sliceView.setLabels(labels);
      sliceView.setData(imageData, maskData);
    }
  }, [initialized, sliceView, imageData, maskData, assignment]);   

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