import { Grid, Header, Icon } from 'semantic-ui-react';
import { Assignments } from 'modules/assignment/components/assignments';

const { Row, Column } = Grid;
const { Subheader } = Header;

export const ReviewSelection = ({ review, waiting }) => {
  const reviewing = review.filter(({ status }) => status === 'review');

  const hasReview = reviewing.length > 0;
  const hasWaiting = waiting.length > 0;

  const reviewSubheader = hasReview > 0 ? 'Select a review to continue' :
    hasWaiting ? <>No current reviews, select a new assignment to review <Icon name='arrow right' /></> :
    'No current reviews';

  const waitingSubheader = hasWaiting ? 'Select an assignment to review' :
    'No assignments awaiting review, check back later';

    console.log(review);

  return (
    <Grid columns={ 2 } >
      <Row>
        <Column>
          <Header as='h4'>
            Your reviews
            <Subheader>
              { reviewSubheader }
            </Subheader>
          </Header>
          <Assignments 
            type='review' 
            header={ 'Reviewing' }
            assignments={ review.filter(({ status }) => status === 'review') } 
          />
          <Assignments 
            type='review' 
            header={ 'Active' }
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