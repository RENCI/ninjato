import { useContext } from 'react';
import { Grid } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { AssignmentMessage } from 'modules/common/components/assignment-message'
import { Volume } from './volume';

const { Column } = Grid;

export const AssignmentSelection = () => {
  const [{ login, volumes }] = useContext(UserContext);

  return (
    <>
      { login &&
        <>
          <AssignmentMessage>
            Select assignment
          </AssignmentMessage>
          <Grid centered padded stretched doubling columns={ 4 }>
            { volumes.map((volume, i) => (
              <Column key={ i }>
                <Volume volume={ volume } />
              </Column>
            ))}
          </Grid>
        </>
      }
    </>
  )
/*
  return (
    <>
      { login ?
        <Grid padded>
          <Row>
            <Column width={ 2 } />
            <Column width={ 12 }>
              <Segment>
                <h3>Welcome { login }!</h3>
                { assignment ? 
                  <Message>
                    <Message.Header>
                      You have an assignment waiting for you
                    </Message.Header>
                    <div style={{ marginTop: 10 }}>
                      <Button 
                        primary 
                        onClick={ onLoadClick }
                      >
                        Load assignment
                      </Button>
                      <Divider horizontal>Or</Divider>
                      { practiceButton }
                    </div>
                  </Message>
                :
                  <Message>
                    <Message.Header>
                      No assignment found!
                    </Message.Header>
                    <div style={{ marginTop: 10 }}>
                      { practiceButton }
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
*/  
};