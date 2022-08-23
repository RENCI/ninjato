import { useContext, useRef, useCallback, useState, useEffect } from 'react';
import { Grid } from 'semantic-ui-react';
import { 
  UserContext,
  AnnotateContext, ANNOTATE_SET_ACTIVE_REGION, ANNOTATE_SET_TOOL
} from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/view/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/view/components/slice-view';
import { VolumeControls } from 'modules/review/components/volume-controls';
import { SliceControls } from 'modules/review/components/slice-controls';
import { SliceSlider } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';

const { Column } = Grid;

export const ReviewContainer = () => {
  const [{ imageData }] = useContext(UserContext);
  const [, annotateDispatch] = useContext(AnnotateContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onEdit, onSliceChange, onSelect, onHover));
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);

  useEffect(() => {
    annotateDispatch({ type: ANNOTATE_SET_TOOL, tool: 'select' })
  }, [annotateDispatch]);

  // Slice view callbacks
  function onEdit() {
    volumeView.current.centerCamera();
    volumeView.current.render();
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

      default:
        console.warn('Unknown select type');
    }    

    sliceView.current.setHighlightRegion(null);
  }

  function onHover(region, highlight = false) {
    sliceView.current.setHighlightRegion(highlight ? region : null);
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
          <SliceControls  sliceView={ sliceView.current } />
        }
      </Grid>
      { !loading && 
        <SaveButtons review={ true } /> 
      }
    </>
  );
};