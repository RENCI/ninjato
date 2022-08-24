import { useContext, useRef, useCallback, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { 
  UserContext, PUSH_REGION_HISTORY,
  AnnotateContext, ANNOTATE_SET_TOOL, ANNOTATE_SET_ACTION, ANNOTATE_SET_ACTIVE_REGION, ANNOTATE_CHANGE_BRUSH_SIZE, ANNOTATE_SET_HOVER_REGION
} from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/view/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/view/components/slice-view';
import { VolumeControls } from 'modules/refine/components/volume-controls';
import { SliceControls } from 'modules/refine/components/slice-controls';
import { SliceSlider } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';
import { ClaimDialog, RemoveDialog, SplitDialog, MergeDialog, CreateDialog, DeleteDialog } from 'modules/refine/components/dialogs';

const { Column } = Grid;

// XXX: Combine onHighlight/onHover, pass info to do highlighting or not

export const RefineContainer = () => {
  const [{ imageData }, userDispatch] = useContext(UserContext);
  const [{ tool }, annotateDispatch] = useContext(AnnotateContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onEdit, onSliceChange, onSelect, onHover, onKeyDown, onKeyUp));
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
        annotateDispatch({ type: ANNOTATE_SET_ACTIVE_REGION, region: region });
        break;

      case 'claim':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'claim', region: region } });     
        break;

      case 'remove':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'remove', region: region  } });     
        break;

      case 'split':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'split', region: region  } });  
        break;

      case 'merge':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'merge', region: region  } });  
        break;

      case 'create':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'create' } });  
        break;

      case 'delete':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'delete', region: region  } });  
        break;

      default:
        console.warn('Unknown select type');
    }    

    sliceView.current.setHighlightRegion(null);

    annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
  }

  function onHover(region, highlight = false) {
    console.log(region, highlight);

    sliceView.current.setHighlightRegion(highlight ? region : null);

    annotateDispatch({ type: ANNOTATE_SET_HOVER_REGION, region: region });
  }

  const handleKeyDown = key => {
    switch (key) {
      case 'Control':
        if (tool !== 'erase') annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'erase' });
        break;

      case 'Shift':
        if (tool !== 'select') annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'select' });
        break;

      default:
    }
  };

  function onKeyDown(evt) {
    handleKeyDown(evt.key);
  }

  const handleKeyUp = key => {
    switch (key) {
      case 'Control': 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        break;

      case 'Shift': 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        break;

      case 'ArrowLeft':
        annotateDispatch({ type: ANNOTATE_CHANGE_BRUSH_SIZE, direction: 'down' });
        break;

      case 'ArrowRight':
        annotateDispatch({ type: ANNOTATE_CHANGE_BRUSH_SIZE, direction: 'up' });
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
      <AssignmentMessage />
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