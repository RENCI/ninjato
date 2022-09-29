import { useContext, useCallback, useState, useEffect, useRef } from 'react';
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
  const [volumeView, setVolumeView] = useState();
  const [sliceView, setSliceView] = useState();
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hoverRegion, setHoverRegion] = useState(null);

  // Create views
  useEffect(() => {
    setVolumeView(VolumeView());
    setSliceView(SliceView());
  }, []);

  useEffect(() => {
    if (!sliceView) return;

    // Should handle case where claiming or removing
    setCanUndo(sliceView.canUndo());
    setCanRedo(sliceView.canRedo());
  }, [sliceView, imageData]);

  // Slice view callbacks
  const onEdit = useCallback((activeRegion = null) => {
    volumeView.centerCamera();
    volumeView.render();

    setCanUndo(sliceView.canUndo());
    setCanRedo(sliceView.canRedo());

    if (activeRegion) userDispatch({ type: PUSH_REGION_HISTORY, activeRegion: activeRegion });
  }, [sliceView, volumeView, userDispatch]);

  const onSliceChange = useCallback(slice => {
    if (!volumeView) return;

    volumeView.setSlice(slice);
    volumeView.render();
    setSlice(slice);
  }, [volumeView, setSlice]);

  const onSelect = useCallback((region, type) => {
    /*
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

    sliceView.setHighlightRegion(null);

    annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
    */
  }, [sliceView, userDispatch, annotateDispatch]);

  const onHover = useCallback(region => {
    setHoverRegion(region);
  }, [setHoverRegion]);

  const onHighlight = useCallback(region => {
    sliceView.setHighlightRegion(region);
  }, [sliceView]);

  // For use in key callbacks to avoid useCallback
  const localTool = useRef();

  const onKeyDown = key => {
    switch (key) {
      case 'Control':
        if (localTool.current !== 'erase') {
          annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'erase' });
          localTool.current = 'erase';
        }
        break;

      case 'Shift':
        if (localTool.current !== 'select') {
          annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'select' });
          localTool.current = 'select';
        }
        break;

      case 'Alt':
        if (localTool.current !== 'navigate') {
          annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'navigate' });
          localTool.current = 'navigate';
        }
        break;

      default:
    }
  };

  const onKeyUp = key => {
    switch (key) {
      case 'Control': 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        localTool.current = 'paint';
        break;

      case 'Shift': 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        localTool.current = 'paint';
        break;

      case 'Alt':
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        localTool.current = 'paint';
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

  // Other callbacks
  const onLoaded = useCallback(() => {
    setLoading(false);
  }, []);

  const onSliderChange = useCallback(value => {
    if (!sliceView || !volumeView) return;

    sliceView.setSlice(value);
    volumeView.setSlice(value);
    setSlice(value);
  }, [sliceView, volumeView]);

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
                <VolumeViewWrapper volumeView={ volumeView } onLoaded={ onLoaded } />
              </Column>
              <Column>
                <RegionPopup 
                  trigger={ 
                    <SliceViewWrapper 
                      sliceView={ sliceView } 
                      onEdit={ onEdit }
                      onSliceChange={ onSliceChange }
                      onSelect={ onSelect }
                      onHover={ onHover }
                      onHighlight={ onHighlight }
                      onKeyDown={ onKeyDown }
                      onKeyUp={ onKeyUp }
                    /> 
                  }
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
            sliceView={ sliceView }
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
          <SplitDialog sliceView={ sliceView } />
          <MergeDialog sliceView={ sliceView } />
          <CreateDialog sliceView={ sliceView } />
          <DeleteDialog sliceView={ sliceView } />
        </>
      }
    </>
  );
};