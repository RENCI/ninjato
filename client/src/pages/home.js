import { useContext } from 'react';
import { Grid } from 'semantic-ui-react';
import { UserContext } from '../contexts';
import { VolumeView, SliceView } from '../vtk';

const { Row, Column } = Grid;

export const Home = () => {
  const [{ login }] = useContext(UserContext);

  return (
    <Grid >
      <Row>
        <Column width={ 2 } >
        </Column>
        <Column width={ 6 }>
          <VolumeView />
        </Column>
        <Column width={ 6 }>
          <SliceView />
        </Column>
        <Column width={ 2 } >
        </Column>
      </Row>
    </Grid>
  );
};