import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, RefineContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, assignment }] = useContext(UserContext);
  const [
    { activeLabel, tool, tools, brushes, paintBrush, eraseBrush, addBrush, showContours, split }
  ] = useContext(RefineContext);
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

  // Labels
  useEffect(() => {
    if (initialized) {
      const labels = assignment.regions.map(({ label }) => label);

      sliceView.setLabels(labels);
    }
  }, [initialized, sliceView, assignment]);   

  // Data
  useEffect(() => {
    if (initialized && imageData && maskData) sliceView.setData(imageData, maskData);
  }, [initialized, sliceView, imageData, maskData]);   

  // Active label
  useEffect(() => {
    if (initialized) sliceView.setActiveLabel(activeLabel);
  }, [initialized, activeLabel]);

  // Tool
  useEffect(() => {
    if (initialized) {
      const toolObject = tools.find(({ value }) => value === tool);
      sliceView.setTool(tool, toolObject.cursor);
    }
  }, [initialized, sliceView, tool, tools]);

  // Paint brush
  useEffect(() => {
    if (initialized) sliceView.setBrush('paint', brushes[paintBrush]);
  }, [initialized, sliceView, brushes, paintBrush]);

  // Erase brush
  useEffect(() => {
    if (initialized) sliceView.setBrush('erase', brushes[eraseBrush]);
  }, [initialized, sliceView, brushes, eraseBrush]);

  // Add brush
  useEffect(() => {
    if (initialized) sliceView.setBrush('add', brushes[addBrush]);
  }, [initialized, sliceView, brushes, addBrush]);

  // Show contours
  useEffect(() => {
    if (initialized) {
      sliceView.setShowContours(showContours);
      //sliceView.render();
    }
  }, [initialized, sliceView, showContours]);

  // Split
  useEffect(() => {
    if (initialized) {
      sliceView.setSplit(split);      
    }
  }, [initialized, sliceView, split]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};