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
import { ClaimDialog, RemoveDialog, SplitDialog, MergeDialog, CreateDialog, DeleteDialog } from 'modules/view/components/dialogs';

const { Column } = Grid;

export const ViewContainer = ({ review = false }) => {
  const [{ imageData }, userDispatch] = useContext(UserContext);
  const [{ tool, options }, annotateDispatch] = useContext(AnnotateContext);
  const [volumeView, setVolumeView] = useState();
  const [sliceView, setSliceView] = useState();
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [sliceHoverRegion, setSliceHoverRegion] = useState(null);
  const [volumeHoverRegion, setVolumeHoverRegion] = useState(null);

  // Create views
  useEffect(() => {
    const sliceView = SliceView();
    setSliceView(sliceView);
    setVolumeView(VolumeView(sliceView.getPainter()));
  }, []);

  useEffect(() => {
    if (!sliceView) return;

    // Should handle case where claiming or removing
    setCanUndo(sliceView.canUndo());
    setCanRedo(sliceView.canRedo());
  }, [sliceView, imageData]);

  // View callbacks
  const onSliceEdit = useCallback((activeRegion = null) => {
    volumeView.centerCamera();
    volumeView.render();

    setCanUndo(sliceView.canUndo());
    setCanRedo(sliceView.canRedo());

    if (activeRegion) userDispatch({ type: PUSH_REGION_HISTORY, activeRegion: activeRegion });
  }, [sliceView, volumeView, userDispatch]);

  const onVolumeEdit = useCallback((activeRegion = null) => {
    setCanUndo(sliceView.canUndo());
    setCanRedo(sliceView.canRedo());

    if (activeRegion) userDispatch({ type: PUSH_REGION_HISTORY, activeRegion: activeRegion });
  }, [sliceView, userDispatch]);

  const onSliceChange = useCallback(slice => {
    if (!volumeView) return;

    volumeView.setSlice(slice);
    volumeView.render();
    setSlice(slice);
  }, [volumeView, setSlice]);

  const onImageMapperChange = useCallback(mapper => {
    volumeView.setImageMapper(mapper);
  }, [volumeView]);

  const onSelect = useCallback((region, type) => {
    switch (type) {
      case 'select':       
        userDispatch({ type: SET_ACTIVE_REGION, region: region });
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        break;

      case 'visibility':
        region.visible = !region.visible;

        volumeView.updateVisibility(region);
        sliceView.updateVisibility(region);
        break;

      case 'claim':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'claim', region: region } });    
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' }); 
        break;

      case 'remove':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'remove', region: region  } }); 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });    
        break;

      case 'split':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'split', region: region  } });
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });  
        break;

      case 'merge':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'merge', region: region  } });  
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        break;

      case 'create':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'create' } });  
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' });
        break;

      case 'delete':
        annotateDispatch({ type: ANNOTATE_SET_ACTION, action: { type: 'delete', region: region  } }); 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'paint' }); 
        break;

      default:
        console.warn('Unknown select type');
    }    

    sliceView.setHighlightRegion(null);
    volumeView.setHighlightRegion(null);
  }, [sliceView, volumeView, userDispatch, annotateDispatch]);

  const onSliceWidgetMove = useCallback(position => {
    volumeView.setWidgetPosition(position);
  }, [volumeView]);

  const onVolumeWidgetMove = useCallback(position => {
    sliceView.setWidgetPosition(position, options.linkPaintSlice);
  }, [sliceView, options.linkPaintSlice]);

  const onSliceHover = useCallback(region => {
    setSliceHoverRegion(region);
  }, [setSliceHoverRegion]);

  const onVolumeHover = useCallback(region => {
    setVolumeHoverRegion(region);
  }, [setVolumeHoverRegion]);

  const onHighlight = useCallback(region => {
    sliceView.setHighlightRegion(region);
    volumeView.setHighlightRegion(region);
  }, [sliceView, volumeView]);

  // For use in key callbacks to avoid needing tool as an argument to useCallback
  const toolRef = useRef();
  const previousToolRef = useRef();

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const onKeyDown = useCallback(key => {
    const clearHighlight = () => { 
      sliceView.setHighlightRegion(null);
      volumeView.setHighlightRegion(null);
    };

    switch (key) {
      case 'Control':
        if (toolRef.current !== 'erase') {
          annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'erase' });
          clearHighlight();
          previousToolRef.current = toolRef.current;
          toolRef.current = 'erase';          
        }
        break;

      case 'Shift':
        if (toolRef.current !== 'select') {
          annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'select' });
          clearHighlight();
          previousToolRef.current = toolRef.current;
          toolRef.current = 'select';
        }
        break;

      case 'Alt':
        if (toolRef.current !== 'navigate') {
          annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'navigate' });
          clearHighlight();
          previousToolRef.current = toolRef.current;
          toolRef.current = 'navigate';
        }
        break;

      case 'ArrowLeft':
        annotateDispatch({ type: ANNOTATE_CHANGE_BRUSH_SIZE, direction: 'down' });
        break;

      case 'ArrowRight':
        annotateDispatch({ type: ANNOTATE_CHANGE_BRUSH_SIZE, direction: 'up' });
        break;

      default:
    }
  }, [annotateDispatch, sliceView, volumeView]);

  const onKeyUp = useCallback(key => {
    switch (key) {
      case 'Control': 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: previousToolRef.current });
        toolRef.current = previousToolRef.current;
        break;

      case 'Shift': 
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: previousToolRef.current });
        toolRef.current = previousToolRef.current;
        break;

      case 'Alt':
        annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: previousToolRef.current });
        toolRef.current = previousToolRef.current;
        break;

      default:
    }
  }, [annotateDispatch]);

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
                <RegionPopup 
                  trigger={ 
                    <VolumeViewWrapper 
                      volumeView={ volumeView } 
                      onEdit={ onVolumeEdit }
                      onLoaded={ onLoaded }
                      onSelect={ onSelect }
                      onWidgetMove={ onVolumeWidgetMove }
                      onHover={ onVolumeHover }
                      onHighlight={ onHighlight }
                    />
                  }
                  region={ volumeHoverRegion }
                />
              </Column>
              <Column>
                <RegionPopup 
                  trigger={ 
                    <SliceViewWrapper 
                      sliceView={ sliceView } 
                      onImageMapperChange={ onImageMapperChange }
                      onEdit={ onSliceEdit }
                      onSliceChange={ onSliceChange }
                      onSelect={ onSelect }
                      onWidgetMove={ onSliceWidgetMove }
                      onHover={ onSliceHover }
                      onHighlight={ onHighlight }
                      onKeyDown={ onKeyDown }
                      onKeyUp={ onKeyUp }
                    /> 
                  }
                  region={ sliceHoverRegion }
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
          <SaveButtons review={ review } /> 
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