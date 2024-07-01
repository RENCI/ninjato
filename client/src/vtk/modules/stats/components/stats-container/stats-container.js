import { useContext, useState } from 'react';
import { Modal, Label, Header } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { api } from 'utils/api';
import { statusColor, statusDisplay } from 'utils/assignment-utils';

const statuses = [
  'active',
  'review',
  'waiting',
  'completed'
];

/*
const reviewStatuses = [
  'review',
  'active',
  'completed'
];
*/

const reviewDisplay = {
  review: 'reviewing',
  active: 'active',
  completed: 'completed'
};


export const StatsContainer = ({ trigger }) => {
  const [{ user }] = useContext(UserContext);
  const [assignments, setAssignments] = useState([]);

  const onOpen = () => {
    const getAssignments = async () => {
      try {
        const { assignments } = await api.getAssignments(user._id, false, user.trainee, true);

        setAssignments(assignments);
      }
      catch (error) {
        console.warn(error);
      }
    };

    getAssignments();
  };

  const regular = assignments ? assignments.filter(({ annotator }) => annotator.login === user.login) : [];
  const review = assignments ? assignments.filter(({ reviewer }) => reviewer.login === user.login) : [];

  return user && (
    <Modal
      dimmer='blurring'
      trigger={ trigger }
      onOpen={ onOpen }
    >
      <Modal.Header>Statistics for { user.login }</Modal.Header>
      <Modal.Content>
        <Header as='h5'>Assignments</Header>
        { statuses.map(status => (
          <Label 
            key={ status }
            color={ statusColor(status) }
          >
            { statusDisplay(status) }
            <Label.Detail>
              { regular.filter(assignment => assignment.status === status).length }
            </Label.Detail>
          </Label>
        ))}
        { user.reviewer && 
          <>
            <Header as='h5'>Reviews</Header>
            { statuses.map(status => (
              <Label 
                key={ status }
                color={ statusColor(status) }
              >
                { reviewDisplay[status] }
                <Label.Detail>
                  { review.filter(assignment => assignment.status === status).length }
                </Label.Detail>
              </Label>
            ))}        
          </>
        }
      </Modal.Content>
    </Modal>
  );
};