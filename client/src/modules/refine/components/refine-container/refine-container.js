import { useContext, useRef, useCallback, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { 
  UserContext, PUSH_REGION_HISTORY,
  RefineContext, REFINE_SET_TOOL, REFINE_SET_ACTION, REFINE_SET_ACTIVE_REGION, REFINE_CHANGE_BRUSH_SIZE,
} from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { RegionSelect } from 'modules/common/components/region-select';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/refine/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/refine/components/slice-view';
import { VolumeControls } from 'modules/refine/components/volume-controls';
import { SliceControls } from 'modules/refine/components/slice-controls';
import { SliceSlider } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';
import { CommentContainer } from 'modules/comment/components/comment-container';
import { ClaimDialog, RemoveDialog, SplitDialog, MergeDialog, CreateDialog, DeleteDialog } from 'modules/refine/components/dialogs';

const { Column } = Grid;

export const RefineContainer = () => {
  const [{ assignment, imageData }, userDispatch] = useContext(UserContext);
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

    userDispatch({ type: PUSH_REGION_HISTORY });
  }

  function onSliceChange(slice) {
    volumeView.current.setSlice(slice);
    volumeView.current.render();
    setSlice(slice);
  }

  function onSelect(region, type) {
    switch (type) {
      case 'select':       
        refineDispatch({ type: REFINE_SET_ACTIVE_REGION, region: region });
        break;

      case 'claim':
        refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'claim', region: region } });     
        break;

      case 'remove':
        refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'remove', region: region  } });     
        break;

      case 'split':
        refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'split', region: region  } });  
        break;

      case 'merge':
        refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'merge', region: region  } });  
        break;

      case 'create':
        refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'create' } });  
        break;

      case 'delete':
        refineDispatch({ type: REFINE_SET_ACTION, action: { type: 'delete', region: region  } });  
        break;

      default:
        console.warn('Unknown select type');
    }    

    sliceView.current.setHighlightRegion(null);

    refineDispatch({ type: REFINE_SET_TOOL, tool: 'paint' });
  }

  function onHighlight(region) {
    sliceView.current.setHighlightRegion(region);
  }

  function onKeyDown(evt) {
    if (evt.key === 'Control') {
      refineDispatch({ type: REFINE_SET_TOOL, tool: 'erase' });
    }
  }

  const handleKeyUp = key => {
    switch (key) {
      case 'Control': 
        refineDispatch({ type: REFINE_SET_TOOL, tool: 'paint' });
        break;

      case 'ArrowLeft':
        refineDispatch({ type: REFINE_CHANGE_BRUSH_SIZE, direction: 'down' });
        break;

      case 'ArrowRight':
        refineDispatch({ type: REFINE_CHANGE_BRUSH_SIZE, direction: 'up' });
        break;

      default:
    }
  };

  function onKeyUp(evt) {
    handleKeyUp(evt.key);
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
        Refining { assignment.regions.length } regions: <RegionSelect />
        <CommentContainer />
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
          <RemoveDialog />
          <SplitDialog sliceView={ sliceView.current } />
          <MergeDialog sliceView={ sliceView.current } />
          <CreateDialog sliceView={ sliceView.current } />
          <DeleteDialog sliceView={ sliceView.current } />
        </>
      }
    </>
  );
};