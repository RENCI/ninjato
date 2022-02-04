import { useContext } from 'react';
import { Grid, Segment, Message, Button, Divider } from 'semantic-ui-react';
import { 
  UserContext, 
  SET_DATA, DataContext 
} from 'contexts';
import { useGetData } from 'hooks';
import { VisualizationContainer } from 'components/visualization-container';
import { api } from 'utils/api';
import { decodeTIFF } from 'utils/data-conversion';

const { Row, Column } = Grid;

export const Home = () => {
  const [{ login, assignment }] = useContext(UserContext);
  const [{ imageData }, dataDispatch] = useContext(DataContext);
  const getData = useGetData();

  const onLoadClick = () => {
    getData(assignment);
  };

  const onLoadPracticeClick = async () => { 
    try {
      const data = await api.getPracticeData();

      const imageData = decodeTIFF(data.imageBuffer);
      const maskData = decodeTIFF(data.maskBuffer);

      dataDispatch({
        type: SET_DATA,
        imageData: imageData,
        maskData: maskData,
        label: 14
      });
    }
    catch (error) {
      console.log(error);
    }      
  };

  return (
    <>
      { imageData ?
        <>
          <VisualizationContainer />
        </>
      : login ?
        <Grid >
          <Row>
            <Column width={ 2 } >            
            </Column>
            <Column width={ 12 }>
              <Segment>
                <h3>Welcome { login }!</h3>
                { assignment ? 
                  <Message>
                    <Message.Header>
                      You have an assignment waiting for you
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
        </Grid>
      : null
      }
    </>
  );
};