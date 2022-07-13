import { Assignments } from 'modules/assignment/components/assignments';

export const ReviewSelection = ({ review, waiting }) => {
  return (
    <>
      <Assignments type='review' assignments={ review } />
      <Assignments type='waiting' assignments={ waiting } />
    </>
  )
};