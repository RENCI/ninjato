import { useRef, useCallback, useState } from 'react';
import { Segment, Grid, Dimmer, Loader } from 'semantic-ui-react';
import { VolumeViewWrapper, VolumeView } from 'components/volume-view';
import { SliceViewWrapper, SliceView } from 'components/slice-view';
import { EditingControls } from 'components/editing-controls';
import { SaveButton } from 'components/save-button';

const { Row, Column } = Grid;

export const VisualizationContainer = () => {
  const volumeView = useRef(VolumeView());
  const [loading, setLoading] = useState(true);

  const onLoaded = () => {
    setLoading(false);
  };
  
  const onEdit = useCallback(() => {
    volumeView.current.render();
  }, [volumeView]);

  const sliceView = useRef(SliceView(onEdit));

  return (
    <div> 
      <Dimmer active={ loading } page>
        <Loader>Loading</Loader>
      </Dimmer>
      <Grid columns='equal' padded>
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