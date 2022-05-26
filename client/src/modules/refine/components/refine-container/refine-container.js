import { useContext, useRef, useCallback, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { 
  UserContext, 
  RefineContext, REFINE_SET_TOOL, REFINE_SET_ACTION
} from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/refine/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/refine/components/slice-view';
import { VolumeControls } from 'modules/refine/components/volume-controls';
import { SliceControls } from 'modules/refine/components/slice-controls';
import { SliceSlider } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';
import { ClaimDialog } from 'modules/refine/components/claim-dialog';
import { AddDialog } from 'modules/refine/components/add-dialog';

const { Column } = Grid;

export const RefineContainer = () => {
  const [{ imageData }] = useContext(UserContext);
  const [, refineDispatch] = useContext(RefineContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onEdit, onSliceChange, onSelect, onHighlight, onKeyDown, onKeyUp));
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Slice view callbacks
  function onEdit() {
    volumeView.current.centerCamera();
    volumeView.current.render();

    setCanUndo(sliceView.current.canUndo());
    setCanRedo(sliceView.current.canRedo());
  }

  function onSliceChange(slice) {
    volumeView.current.setSlice(slice);
    volumeView.current.render();
    setSlice(slice);
  }

  function onSelect(label, type) {
    if (type === 'select') {
      sliceView.current.setActiveLabel(label);
      volumeView.current.setActiveLabel(label);
      //volumeView.current.render();
    }
    else if (type === 'claim') {
      refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'claim', label: label } });     
    }    
    else if (type === 'add') {
      refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'add' } });  
    }    
    else if (type === 'merge') {
      refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'merge', label: label } });  
    }    

    sliceView.current.setHighlightLabel(null);
  }

  function onHighlight(label) {
    sliceView.current.setHighlightLabel(label);
  }

  function onKeyDown(evt) {
    if (evt.key === 'Control') {
      refineDispatch({ type: REFINE_SET_TOOL, tool: 'erase' });
    }
  }

  function onKeyUp(evt) {
    if (evt.key === 'Control') {
      refineDispatch({ type: REFINE_SET_TOOL, tool: 'paint' });
    }
  }

  // Other callbacks
  const onLoaded = useCallback(() => {
    setLoading(false);
  }, []);

  const onSliderChange = useCallback(value => {
    sliceView.current.setSlice(value);
    volumeView.current.setSlice(value);
    setSlice(value);
  }, [sliceView]);

  const numSlices = imageData ? imageData.getDimensions()[2] : 0; 

  return (
    <> 
      <VisualizationLoader loading={ loading } />
      <AssignmentMessage>
        Refine colored region boundaries
      </AssignmentMessage>
      <Grid columns='equal' verticalAlign='middle' padded stackable reversed='mobile'>
        { !loading && 
          <VolumeControls />
        }
        <Column>
          <VisualizationSection>
            <Grid columns='equal' stackable padded reversed='mobile'>
              <Column>
                <VolumeViewWrapper volumeView={ volumeView.current } onLoaded={ onLoaded } />
              </Column>
              <Column>
                <SliceViewWrapper sliceView={ sliceView.current } />
              </Column>                  
                { !loading &&
                  <SliceSlider 
                    value={ slice } 
                    min={ 0 }
                    max={ numSlices - 1 }
                    onChange={ onSliderChange } 
                  />
                }
            </Grid>            
          </VisualizationSection>
        </Column>
        { !loading && 
          <SliceControls 
            sliceView={ sliceView.current }
            canUndo={ canUndo }
            canRedo={ canRedo }
          />
        }
      </Grid>
      { !loading && 
        <>
          <SaveButtons /> 
          <ClaimDialog />
          <AddDialog 
            sliceView={ sliceView.current } 
            volumeView={ volumeView.current }
           />
        </>
      }
    </>
  );
};