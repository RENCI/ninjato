import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, AnnotateContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView, onEdit, onSliceChange, onSelect, onHover, onHighlight, onKeyDown, onKeyUp }) => {
  const [{ imageData, maskData, assignment, volumes, activeRegion }] = useContext(UserContext);
  const [{ tool, tools, brushes, paintBrush, eraseBrush, createBrush, showContours }] = useContext(AnnotateContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const sliceRanges = useRef();
  const { width } = useResize(div);
  
  // Initialize
  useEffect(() => {
    if (sliceView && !initialized && div.current && width) { 
      sliceView.initialize(div.current);
      setInitialized(true);
    }
  }, [initialized, div, width, sliceView]);

  // Callbacks
  useEffect(() => {
    if (initialized) sliceView.setCallback('edit', onEdit);
  }, [initialized, sliceView, onEdit]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('sliceChange', onSliceChange);
  }, [initialized, sliceView, onSliceChange]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('select', onSelect);
  }, [initialized, sliceView, onSelect]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('hover', onHover);
  }, [initialized, sliceView, onHover]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('highlight', onHighlight);
  }, [initialized, sliceView, onHighlight]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('keyDown', onKeyDown);
  }, [initialized, sliceView, onKeyDown]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('keyUp', onKeyUp);
  }, [initialized, sliceView, onKeyUp]);

  // Assignment
  useEffect(() => {
    if (initialized) {
      const volume = volumes.find(({ id }) => id === assignment.subvolumeId);
      sliceRanges.current = volume.sliceRanges.slice(assignment.location.z_min, assignment.location.z_max + 1);

      sliceView.setRegions(assignment.regions, assignment.backgroundRegions);
    }
  }, [initialized, sliceView, assignment, volumes]);   

  // Data
  useEffect(() => {
    if (initialized && imageData && maskData) {
      sliceView.setData(imageData, maskData, sliceRanges.current);
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

      if (tool === 'navigate') {
        sliceView.setTool(null, toolObject.cursor);
      }
      else {
        sliceView.setTool(tool, toolObject.cursor);
      }
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
    return () => {
      if (initialized) sliceView.cleanUp();
    }
  }, [initialized, sliceView]);

  return (
    <div ref={ div } style={{ height: width }} />
  );
};