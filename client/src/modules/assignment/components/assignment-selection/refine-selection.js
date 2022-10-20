import { useContext } from 'react';
import { Grid, Header, Icon } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { Assignments } from 'modules/assignment/components/assignments';
import { Volumes } from 'modules/assignment/components/volumes';
import { hasActive } from 'utils/assignment-utils';

const { Row, Column } = Grid;
const { Subheader } = Header;

export const RefineSelection = ({ assignments }) => {
  const [{ volumes }] = useContext(UserContext);

  const active = hasActive(assignments);
  const available = volumes && volumes.filter(({ annotations }) => annotations.available > 0).length > 0;

  const assignmentSubheader = active ? 'Select an active assignment to continue' :
    available ? <>No active assignments, select an available volume to request a new assignment <Icon name='arrow right' /></> :
    'No active assignments';

  const volumesSubheader = !volumes || volumes.length === 0 ? null :
    active ? 'Complete any active assignments before requesting a new assignment' :
    available ? 'Select an available volume to request a new assignment' :
    'No volumes available';

  return (
    <Grid columns={ 2 } >
      <Row>
        <Column>
          <Header as='h4'>
            Your assignments
            <Subheader>
              { assignmentSubheader }
            </Subheader>
          </Header>
          <Assignments 
            type='refine' 
            header={ 'Active' }
            assignments={ assignments.filter(({ status }) => status === 'active') } 
          />
          <Assignments 
            type='refine' 
            header={ 'Under review' }
            assignments={ assignments.filter(({ status, reviewer }) => status !== 'active' && reviewer?.login) }
          />
          <Assignments 
            type='refine' 
            header={ 'Awaiting review' }
            assignments={ assignments.filter(({ status, reviewer }) => status === 'waiting' && !reviewer?.login) }
          />
        </Column>
        <Column>
          <Header as='h4'>
            Volumes
            <Subheader>
              { volumesSubheader }
            </Subheader>      
          </Header>
          <Volumes 
            volumes={ volumes } 
            enabled={ !active }
          />   
        </Column>
      </Row>     
    </Grid>
  )
};