import { useContext, useRef, useCallback, useState } from 'react';
import { Segment, Grid, Dimmer, Loader } from 'semantic-ui-react';
import { DataContext } from 'contexts/data-context';
import { VolumeViewWrapper, VolumeView } from 'components/volume-view';
import { SliceViewWrapper, SliceView } from 'components/slice-view';
import { EditingControls } from 'components/editing-controls';
import { VerticalSlider } from 'components/vertical-slider';
import { SaveButton } from 'components/save-button';

const { Row, Column } = Grid;

export const VisualizationContainer = () => {
  const [{ imageData }] = useContext(DataContext);
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView(onEdit, onSliceChange));
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  function onEdit() {
    volumeView.current.render();

    setCanUndo(sliceView.current.canUndo());
    setCanRedo(sliceView.current.canRedo());
  }

  function onSliceChange(slice) {
    setSlice(slice);
  }

  const onLoaded = useCallback(() => {
    setLoading(false);
  }, []);

  const onSliderChange = useCallback(value => {
    sliceView.current.setSlice(value);
    setSlice(value);
  }, [sliceView]);

  const numSlices = imageData ? imageData.getDimensions()[2] : 0;  

  return (
    <div> 
      <Dimmer active={ loading } page>
        <Loader>Loading</Loader>
      </Dimmer>
      <Grid columns='equal' verticalAlign='middle' padded stackable reversed='mobile'>
        <Column>
          <Segment raised>
            <Grid columns='equal'>              
              <Row>
                <Column>
                  <VolumeViewWrapper volumeView={ volumeView.current } onLoaded={ onLoaded } />
                </Column>
                <Column>
                  <SliceViewWrapper sliceView={ sliceView.current } />
                </Column>                  
                  { !loading &&
                    <div style={{ flex: '0 0 auto', width: 30 }}>
                      <VerticalSlider 
                        value={ slice } 
                        min={ 0 }
                        max={ numSlices - 1 }
                        onChange={ onSliderChange } 
                      />
                    </div>
                  }
              </Row>
            </Grid>            
          </Segment>
        </Column>
        { !loading && 
          <Column style={{ flex: '0 0 auto' }}>
            <EditingControls 
              sliceView={ sliceView.current }
              canUndo={ canUndo }
              canRedo={ canRedo }
             />
          </Column>
        }
      </Grid>
      { !loading &&
        <Segment basic textAlign='center'>
          <SaveButton  
            text='Save' 
          />
          <SaveButton  
            text='Submit'
            color='green'
            done={ true } 
          />
        </Segment>
      }
    </div>
  );
};