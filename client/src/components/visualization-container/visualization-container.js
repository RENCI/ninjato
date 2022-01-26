import { useRef, useCallback } from 'react';
import { Segment, Grid } from 'semantic-ui-react';
import { VolumeViewWrapper, VolumeView } from 'components/volume-view';
import { SliceViewWrapper, SliceView } from 'components/slice-view';
import { EditingControls } from 'components/editing-controls';
import { SaveButton } from 'components/save-button';

const { Row, Column } = Grid;

export const VisualizationContainer = () => {
  const volumeView = useRef(VolumeView());
  
  const onEdit = useCallback(() => {
    volumeView.current.render();
  }, [volumeView]);

  const sliceView = useRef(SliceView(onEdit));

  return (
    <>
      <Grid columns='equal' padded>
        <Column>
          <Segment raised>
            <Grid columns='equal'>
              <Column>
                <VolumeViewWrapper volumeView={ volumeView.current } />
              </Column>
              <Column>
                <SliceViewWrapper sliceView={ sliceView.current } />
              </Column>
            </Grid>
          </Segment>
        </Column>
        <Column style={{ flex: '0 0 auto' }}>
          <EditingControls />
        </Column>
      </Grid>
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
    </>
  );
};