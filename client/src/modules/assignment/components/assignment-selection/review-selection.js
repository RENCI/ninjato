import { Assignments } from 'modules/assignment/components/assignments';

export const ReviewSelection = ({ review, waiting }) => {
  const hasReview = review.length > 0;
  const hasWaiting = waiting.length > 0;

  const reviewHeader = hasReview ? 'Current reviews' : 'No current reviews';
  const reviewSubheader = hasReview > 0 ? 'Select an review to continue' :
    waiting ? 'No current reviews, select an assignment awaiting review below' :
    'No active reviews';

  const waitingHeader = hasWaiting ? 'Assignments awaiting review' : 'No assignments awaiting review';
  const waitingSubheader = hasWaiting ? 'Select an assignment awaiting review' :
    'No assignments awaiting review';

  return (
    <>
      <Assignments 
        type='review' 
        header={ reviewHeader }
        subheader={ reviewSubheader }
        assignments={ review } 
      />
      <Assignments 
        type='waiting' 
        header={ waitingHeader }
        subheader={ waitingSubheader }
        assignments={ waiting } 
      />
    </>
  )
};