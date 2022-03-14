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
};