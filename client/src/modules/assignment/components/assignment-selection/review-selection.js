import { Grid, Header, Icon } from 'semantic-ui-react';
import { Assignments } from 'modules/assignment/components/assignments';

const { Row, Column } = Grid;
const { Subheader } = Header;

export const ReviewSelection = ({ review, waiting }) => {
  const hasReview = review.length > 0;
  const hasWaiting = waiting.length > 0;

  const reviewSubheader = hasReview > 0 ? 'Select a review to continue' :
    hasWaiting ? <>No current reviews, select a new assignment to review <Icon name='arrow right' /></> :
    'No current reviews';

  const waitingSubheader = hasWaiting ? 'Select a new assignment to review' :
    'No assignments awaiting review, check back later';

  return (
    <Grid columns={ 2 } >
      <Row>
        <Column>
          <Header as='h4'>
            Your active reviews
            <Subheader>
              { reviewSubheader }
            </Subheader>
          </Header>
          <Assignments 
            type='review' 
            header={ 'Reviewing' }
            assignments={ review.filter(({ status }) => status !== 'active') } 
          />
          <Assignments 
            type='review' 
            header={ 'Submitted for annotation' }
            assignments={ review.filter(({ status }) => status === 'active') } 
          />
        </Column>
        <Column>
          <Header as='h4'>
            Awaiting review
            <Subheader>
              { waitingSubheader }
            </Subheader>
          </Header>
          <Assignments 
            type='waiting' 
            assignments={ waiting } 
          />
          </Column>
      </Row>
    </Grid>
  )
};