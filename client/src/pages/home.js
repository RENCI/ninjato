import { useContext } from 'react';
import { Grid, Segment, Message, Button, Divider } from 'semantic-ui-react';
import { 
  UserContext, 
  SET_DATA, DataContext 
} from '../contexts';
import { VolumeView } from '../components/volume-view';
import { TestPaintView } from '../components/slice-view';
import { api } from '../api';
import { readTIFF } from '../utils/data-reader';

const { Row, Column } = Grid;

export const Home = () => {
  const [{ login, assignment }] = useContext(UserContext);
  const [{ imageData }, dataDispatch] = useContext(DataContext);

  const onLoadClick = async () => { 
    try {
      const data = await api.getData(assignment.imageId, assignment.maskId);

      const imageData = readTIFF(data.imageBuffer);
      const maskData = readTIFF(data.maskBuffer);

      dataDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData
      });
    }
    catch (error) {
      console.log(error);
    }      
  };

  const onLoadPracticeClick = async () => { 
    try {
      const data = await api.getPracticeData();

      const imageData = readTIFF(data.imageBuffer);
      const maskData = readTIFF(data.maskBuffer);

      dataDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData
      });
    }
    catch (error) {
      console.log(error);
    }      
  };

  return (
    <Grid >
      { imageData ?
        <Row>
          <Column width={ 2 } >
          </Column>
          <Column width={ 6 }>
            <VolumeView />
          </Column>
          <Column width={ 6 }>
            <TestPaintView />
          </Column>
          <Column width={ 2 } >
          </Column>
        </Row>
      : login ?
        <Row>
          <Column width={ 2 } >            
          </Column>
          <Column width={ 12 }>
            <Segment>
              <h3>Welcome { login }!</h3>
              { assignment ? 
                <Message>
                  <Message.Header>
                    You have an assignment waiting for you.
                  </Message.Header>
                  <div style={{ marginTop: 10 }}>
                    <Button primary onClick={ onLoadClick }>Load assignment</Button>
                    <Divider horizontal>Or</Divider>
                    <Button secondary onClick={ onLoadPracticeClick }>Load practice data</Button>
                  </div>
                </Message>
              :
                <Message>
                  <Message.Header>
                    No assignment found!
                  </Message.Header>
                  <div style={{ marginTop: 10 }}>
                    <Button secondary onClick={ onLoadPracticeClick }>Load practice data</Button>
                  </div>
                </Message>              
              }
            </Segment>
          </Column>
        </Row>
      : null
      }
    </Grid>
  );
};