import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, AnnotateContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView, useGold = false, onEdit, onImageMapperChange, onSliceChange, onSelect, onWidgetMove, onHover, onHighlight, onKeyDown, onKeyUp }) => {
  const [{ imageData, maskData, backgroundMaskData, goldData, embeddings, assignment, volumes, activeRegion }] = useContext(UserContext);
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
    if (initialized) sliceView.setCallback('imageMapperChange', onImageMapperChange);
  }, [initialized, sliceView, onImageMapperChange]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('sliceChange', onSliceChange);
  }, [initialized, sliceView, onSliceChange]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('select', onSelect);
  }, [initialized, sliceView, onSelect]);

  useEffect(() => {
    if (initialized) sliceView.setCallback('widgetMove', onWidgetMove);
  }, [initialized, sliceView, onWidgetMove]);

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
    if (initialized && imageData && (maskData || (useGold && goldData)) && backgroundMaskData && embeddings) {
      sliceView.setData(imageData, useGold ? goldData : maskData, backgroundMaskData, embeddings, sliceRanges.current);
    }
  }, [initialized, sliceView, imageData, maskData, backgroundMaskData, embeddings, useGold, goldData, volumes]);   

  // Active region
  useEffect(() => {
    if (initialized) sliceView.setActiveRegion(activeRegion);
  }, [initialized, sliceView, activeRegion]);

  // Tool
  useEffect(() => {
    if (initialized && !useGold) {
      const toolObject = tools.find(({ value }) => value === tool); 

      if (tool === 'navigate') {
        sliceView.setTool(null, toolObject.cursor);
      }
      else {
        sliceView.setTool(tool, toolObject.cursor);
      }
    }
  }, [initialized, useGold, sliceView, tool, tools]);

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
      sliceView.render();
    }
  }, [initialized, sliceView, showContours]);

  // Clean up
  useEffect(() => {
    return () => {
      if (initialized) sliceView.cleanUp();
    }
  }, [initialized, sliceView]);

  return (
    <div 
      ref={ div } 
      style={{ height: width }}
      onMouseOut={ () => {
        onHover(null);
        onHighlight(null);
        if (sliceView) sliceView.mouseOut();
      }}
    />
  );
};