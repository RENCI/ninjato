import { useContext, useRef, useCallback, useState, useEffect } from 'react';
import { Grid } from 'semantic-ui-react';
import { 
  UserContext, PUSH_REGION_HISTORY, SET_ACTIVE_REGION,
  AnnotateContext, ANNOTATE_SET_TOOL, ANNOTATE_SET_ACTION, ANNOTATE_CHANGE_BRUSH_SIZE
} from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/view/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/view/components/slice-view';
import { VolumeControls } from 'modules/refine/components/volume-controls';
import { SliceControls } from 'modules/refine/components/slice-controls';
import { SliceSlider, SliceLabel } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';
import { RegionPopup } from 'modules/region/components/region-popup';
import { ClaimDialog, RemoveDialog, SplitDialog, MergeDialog, CreateDialog, DeleteDialog } from 'modules/refine/components/dialogs';

const { Column } = Grid;

export const RefineContainer = () => {
  const [{ imageData }, userDispatch] = useContext(UserContext);
  const [{ tool }, annotateDispatch] = useContext(AnnotateContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onEdit, onSliceChange, onSelect, onHover, onHighlight, onKeyDown, onKeyUp));
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hoverRegion, setHoverRegion] = useState(null);

  useEffect(() => {
    // Should handle case where claiming or removing
    setCanUndo(sliceView.current.canUndo());
    setCanRedo(sliceView.current.canRedo());
  }, [imageData]);

  // Slice view callbacks
  function onEdit(activeRegion = null) {
    volumeView.current.centerCamera();
    volumeView.current.render();

    setCanUndo(sliceView.current.canUndo());
    setCanRedo(sliceView.current.canRedo());

    if (activeRegion) userDispatch({ type: PUSH_REGION_HISTORY, activeRegion: activeRegion });
  }

  function onSliceChange(slice) {
    volumeView.current.setSlice(slice);
    volumeView.current.render();
    setSlice(slice);
  }

  function onSelect(region, type) {
    switch (type) {
      case 'select':       
        userDispatch({ type: SET_ACTIVE_REGION, region: region });
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

  function onHover(region) {
    setHoverRegion(region);
  }

  function onHighlight(region) {
    sliceView.current.setHighlightRegion(region);
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
                <RegionPopup 
                  trigger={ <SliceViewWrapper sliceView={ sliceView.current } /> }
                  region={ hoverRegion }
                /> 
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
            <SliceLabel slice={ slice } />
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