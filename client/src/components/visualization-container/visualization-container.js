import { useRef, useCallback, useState } from 'react';
import { Segment, Grid, Dimmer, Loader } from 'semantic-ui-react';
import { VolumeViewWrapper, VolumeView } from 'components/volume-view';
import { SliceViewWrapper, SliceView } from 'components/slice-view';
import { EditingControls, VerticalSlider } from 'components/editing-controls';
import { SaveButton } from 'components/save-button';

const { Row, Column } = Grid;

export const VisualizationContainer = () => {
  const volumeView = useRef(VolumeView());
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState(0);

  const onLoaded = useCallback(() => {
    setLoading(false);
  }, []);
  
  const onEdit = useCallback(() => {
    volumeView.current.render();
  }, [volumeView]);

  const onSliceChange = useCallback(slice => {
    setSlice(slice);
  }, []);

  const sliceView = useRef(SliceView(onEdit, onSliceChange));

  const onSliderChange = useCallback(value => {
    sliceView.current.setSlice(value);
    setSlice(value);
  }, [sliceView]);

  return (
    <div> 
      <Dimmer active={ loading } page>
        <Loader>Loading</Loader>
      </Dimmer>
      <Grid columns='equal' padded stackable reversed='mobile'>
        <Column>
          <Segment raised>
            <Grid columns='equal'>              
              <Row>
                <Column>
                  <VolumeViewWrapper volumeView={ volumeView.current } onLoaded={ onLoaded } />
                </Column>
                <Column>
                  <SliceViewWrapper sliceView={ sliceView.current } slice={ slice } />
                </Column>                  
                <div style={{ flex: '0 0 auto', width: 30 }}>
                  <VerticalSlider 
                    value={ slice } 
                    min={ 0 }
                    max={ 29 }  // XXX: FIX HARD-CODED VALUE
                    onChange={ onSliderChange } 
                  />
                </div>
              </Row>
            </Grid>            
          </Segment>
        </Column>
        { !loading && 
          <Column style={{ flex: '0 0 auto' }}>
            <EditingControls />
          </Column>
        }
      </Grid>
      { !loading &&
        <Segment basic textAlign='right'>
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