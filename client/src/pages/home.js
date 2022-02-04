import { useContext } from 'react';
import { Grid, Segment, Message, Button, Divider } from 'semantic-ui-react';
import { UserContext, DataContext } from 'contexts';
import { useLoadData, useLoadPracticeData } from 'hooks';
import { VisualizationContainer } from 'components/visualization-container';

const { Row, Column } = Grid;

export const Home = () => {
  const [{ login, assignment }] = useContext(UserContext);
  const [{ imageData }] = useContext(DataContext);
  const loadData = useLoadData();
  const loadPracticeData = useLoadPracticeData();

  const onLoadClick = () => {
    loadData(assignment);
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
                      <Button secondary onClick={ loadPracticeData }>Load practice data</Button>
                    </div>
                  </Message>
                :
                  <Message>
                    <Message.Header>
                      No assignment found!
                    </Message.Header>
                    <div style={{ marginTop: 10 }}>
                      <Button secondary onClick={ loadPracticeData }>Load practice data</Button>
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