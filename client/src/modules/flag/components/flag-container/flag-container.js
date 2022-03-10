import { useContext, useRef, useCallback, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { DataContext, FlagContext, FLAG_ADD_LINK, FLAG_REMOVE_LINK } from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/flag/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/flag/components/slice-view';
import { VolumeControls } from 'modules/flag/components/volume-controls';
import { SliceControls } from 'modules/flag/components/slice-controls';
import { SliceSlider } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';
import { Reds, Blues, cssString } from 'utils/colors';

const { Column } = Grid;

export const FlagContainer = () => {
  const [{ imageData }] = useContext(DataContext);
  const [,flagDispatch] = useContext(FlagContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onAddLink, onRemoveLink, onHighlight, onSliceChange));
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  
  // Slice view callbacks
  function onAddLink(label) {
    flagDispatch({ type: FLAG_ADD_LINK, label: label });
  }

  function onRemoveLink(label) {
    flagDispatch({ type: FLAG_REMOVE_LINK, label: label });
  }

  function onHighlight(label) {
    sliceView.current.setHighlightLabel(label);
  }

  function onSliceChange(slice) {
    volumeView.current.setSlice(slice);
    volumeView.current.render();
    setSlice(slice);
  }

  const onLoaded = useCallback(() => {
    setLoading(false);
  }, []);

  const onSliderChange = useCallback(value => {
    sliceView.current.setSlice(value);
    volumeView.current.setSlice(value);
    setSlice(value);
  }, [sliceView]);

  const numSlices = imageData ? imageData.getDimensions()[2] : 0;  

  const red = cssString(Reds[5]);
  const blue = cssString(Blues[5]);

  return (
    <> 
      <VisualizationLoader loading={ loading } />
      <AssignmentMessage>
        Flag problems with <span style={{ color: red, fontWeight: 'bold' }}>red  region</span>,
        link associated <span style={{ color: blue, fontWeight: 'bold' }}>blue regions</span>
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
          <SliceControls sliceView={ sliceView.current } />
        }
      </Grid>
      { !loading && <SaveButtons /> }
    </>
  );
};