import { useContext } from 'react';
import { Grid, Segment, Message, Button, Divider } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { useLoadData, useLoadPracticeData } from 'hooks';

const { Row, Column } = Grid;

export const AssignmentSelection = () => {
  const [{ login, assignment }] = useContext(UserContext);
  const loadData = useLoadData();
  const loadPracticeData = useLoadPracticeData();

  const onLoadClick = () => {
    loadData(assignment);
  };

  return (
    <>
      { login ?
        <Grid padded>
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