import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, RefineContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData, assignment, volumes }] = useContext(UserContext);
  const [
    { activeRegion, tool, tools, brushes, paintBrush, eraseBrush, createBrush, showContours }
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

  // Assignment
  useEffect(() => {
    if (initialized) {
      sliceView.setRegions(assignment.regions);
    }
  }, [initialized, sliceView, assignment]);   

  // Data
  useEffect(() => {
    if (initialized && imageData && maskData) {
      const volume = volumes.find(({ id }) => id === assignment.subvolumeId);
      const sliceRanges = volume.sliceRanges.slice(assignment.location.z_min, assignment.location.z_max + 1);

      sliceView.setData(imageData, maskData, sliceRanges);
    }
  }, [initialized, sliceView, imageData, maskData, volumes]);   

  // Active region
  useEffect(() => {
    if (initialized) sliceView.setActiveRegion(activeRegion);
  }, [initialized, sliceView, activeRegion]);

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
    if (initialized) sliceView.setBrush('create', brushes[createBrush]);
  }, [initialized, sliceView, brushes, createBrush]);

  // Show contours
  useEffect(() => {
    if (initialized) {
      sliceView.setShowContours(showContours);
      //sliceView.render();
    }
  }, [initialized, sliceView, showContours]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};