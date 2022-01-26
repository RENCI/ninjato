import { useRef, useCallback } from 'react';
import { Segment, Grid } from 'semantic-ui-react';
import { VolumeViewWrapper, VolumeView } from 'components/volume-view';
import { SliceViewWrapper, SliceView } from 'components/slice-view';
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
      <Segment raised style={{ margin: '1rem' }}>
        <Grid columns='equal'>
          <Row>
            <Column>
              <VolumeViewWrapper volumeView={ volumeView.current } />
            </Column>
            <Column>
              <SliceViewWrapper sliceView={ sliceView.current } />
            </Column>
          </Row>
        </Grid>
      </Segment>
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