import { useContext, useState, useRef, useEffect } from 'react';
import { UserContext, AnnotateContext } from 'contexts';
import { useResize } from 'hooks';

export const VolumeViewWrapper = ({ volumeView, onLoaded, onEdit, onSelect, onHover }) => {
  const [{ maskData, assignment, activeRegion }] = useContext(UserContext);
  const [{ tool, tools, showBackground }] = useContext(AnnotateContext);
  const [initialized, setInitialized] = useState(false);
  const div = useRef(null);
  const { width } = useResize(div);

  // Initialize
  useEffect(() => {
    if (volumeView && !initialized && div.current && width) { 
      volumeView.initialize(div.current);
      setInitialized(true);
    }
  }, [initialized, div, width, volumeView]);

  // Callbacks
  useEffect(() => {
    if (initialized) volumeView.setCallback('edit', onEdit);
  }, [initialized, volumeView, onEdit]);

  useEffect(() => {
    if (initialized) volumeView.setCallback('select', onSelect);
  }, [initialized, volumeView, onSelect]);

  useEffect(() => {
    if (initialized) volumeView.setCallback('hover', onHover);
  }, [initialized, volumeView, onHover]);

  // Regions
  useEffect(() => {
    if (initialized) {
      volumeView.setRegions(assignment.regions, assignment.backgroundRegions);
    }
  }, [initialized, volumeView, assignment]); 

  // Data
  useEffect(() => {
    if (initialized && maskData) {
      volumeView.setData(maskData);
      volumeView.render(onLoaded);
    }
  }, [initialized, volumeView, maskData, onLoaded]);   

  // Active region
  useEffect(() => {
    if (initialized) volumeView.setActiveRegion(activeRegion);
  }, [initialized, volumeView, activeRegion]);

  // Tool
  useEffect(() => {
    if (initialized) {
      const toolObject = tools.find(({ value }) => value === tool);

      if (toolObject.volume) {
        volumeView.setTool(tool, toolObject.cursor);
      }
      else {
        // Default to navigate
        const toolObject = tools.find(({ value }) => value === 'navigate');
        volumeView.setTool(null, toolObject.cursor);
        
        //const toolObject = tools.find(({ value }) => value === 'select');
        //volumeView.setTool('select', toolObject.cursor);
      }
    }
  }, [initialized, volumeView, tool, tools]);

  // Show background
  useEffect(() => {
    if (initialized) {
      volumeView.setShowBackground(showBackground);
      volumeView.render();
    }
  }, [initialized, volumeView, showBackground]);

  // Clean up
  useEffect(() => {
    return () => {
      if (initialized) volumeView.cleanUp();
    }
  }, [initialized, volumeView]);

  return (
    <div 
      ref={ div } 
      style={{ height: width }}
      onMouseOut={ () => {
        onHover(null);
        if (volumeView) volumeView.setHoverLabel(null);
      }}
    />
  );
};