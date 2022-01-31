import { useContext, useRef, useEffect } from 'react';
import { Input } from 'semantic-ui-react';
import { DataContext, ControlsContext } from 'contexts';
import { useResize } from 'hooks';

export const SliceViewWrapper = ({ sliceView }) => {
  const [{ imageData, maskData }] = useContext(DataContext);
  const [{ editMode }] = useContext(ControlsContext);
  const div = useRef(null);
  const { width } = useResize(div);
  
  // Initialize
  useEffect(() => {
    if (div.current && width) { 
      sliceView.initialize(div.current);
    }
  }, [div, width, sliceView]);

  // Update data
  useEffect(() => {
    if (div.current && width && imageData && maskData) {
      sliceView.setData(imageData, maskData);
    }
  }, [div, width, sliceView, imageData, maskData]);   

  // Edit mode
  useEffect(() => {
    sliceView.setEditMode(editMode);
  }, [sliceView, editMode]);

  // Clean up
  useEffect(() => {
    return () => sliceView.cleanUp();
  }, [sliceView]);

  return (
    <>
      <div ref={ div } style={{ height: width }} />
      <Input 
        type='range' 
        style={{ 
          transform: 'rotate(270deg)',
          position: 'absolute',
          top: '50%',
          left: 'calc(50% - 10px)',
          paddingRight: 15,
          paddingLeft: 15,
          width: '100%',
          height: 0
        }}
      />
    </>
  );
};