import React, { useContext } from 'react';
import { Grid } from 'semantic-ui-react';
import { UserContext } from '../contexts';
import { VolumeView, SliceView } from '../vtk';

const { Row, Column } = Grid;

export const Home = () => {
  const [{ login }] = useContext(UserContext);

  return (
    <Grid container columns={ 2 }>
      <Row>
        <Column>
          <VolumeView />
        </Column>
        <Column>
          <SliceView />
        </Column>
      </Row>
    </Grid>
  );
};