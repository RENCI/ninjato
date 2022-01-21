import { useRef, useCallback } from 'react';
import { Grid } from 'semantic-ui-react';
import { VolumeViewWrapper, VolumeView } from 'components/volume-view';
import { SliceViewWrapper, SliceView } from 'components/slice-view';

const { Row, Column } = Grid;

export const VisualizationContainer = () => {
  const volumeView = useRef(VolumeView());
  const sliceView = useRef(SliceView());
  
  const onEdit = useCallback(() => {
    volumeView.current.render();
  }, [volumeView]);

  return (
    <Grid >
      <Row>
        <Column width={ 2 } ></Column>
        <Column width={ 6 }>
          <VolumeViewWrapper 
            volumeView={ volumeView.current } 
          />
        </Column>
        <Column width={ 6 }>
          <SliceViewWrapper 
            sliceView={ sliceView.current }
            onEdit={ onEdit } 
          />
        </Column>
        <Column width={ 2 } ></Column>
      </Row>
    </Grid>
  );
};