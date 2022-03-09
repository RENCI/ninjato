import { useContext, useRef, useCallback, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { DataContext } from 'contexts/data-context';
import { AssignmentMessage } from 'modules/common/components/assignment-message';
import { VisualizationLoader, VisualizationSection } from 'modules/common/components/visualization-container';
import { VolumeViewWrapper, VolumeView } from 'modules/flag/components/volume-view';
import { SliceViewWrapper, SliceView } from 'modules/flag/components/slice-view';
import { VolumeControls } from 'modules/flag/components/volume-controls';
import { SliceControls } from 'modules/flag/components/slice-controls';
import { SliceSlider } from 'modules/common/components/slice-slider';
import { SaveButtons } from 'modules/assignment/components/save-buttons';
import { Reds, cssString } from 'utils/colors';

const { Column } = Grid;

export const FlagContainer = () => {
  const [{ imageData }] = useContext(DataContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onEdit, onSliceChange));
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  
  function onEdit() {
    volumeView.current.render();
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

  const color = cssString(Reds[5]);

  return (
    <> 
      <VisualizationLoader loading={ loading } />
      <AssignmentMessage>
        Flag problems with <span style={{ color: color, fontWeight: 'bold' }}>red  region</span>
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