import { useContext, useEffect } from 'react';
import { Modal, Label } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { statusColor, statusDisplay } from 'utils/assignment-utils';
import { useGetAssignments } from 'hooks';

const { Header, Content } = Modal;

const statuses = [
  'active',
  'review',
  'waiting',
  'completed',
  'inactive'
];

export const StatsContainer = ({ trigger }) => {
  const [{ user, assignments }] = useContext(UserContext);
  const getAssignments = useGetAssignments();

  useEffect(() => {  
    if (user && !assignments) getAssignments(user._id, user.reviewer);    
  }, [user, assignments, getAssignments]);

  return assignments && (
    <Modal
      dimmer='blurring'
      trigger={ trigger }
    >
      <Header>Statistics for { user.login }</Header>
      <Content>
        { statuses.map(status => (
          <Label 
            key={ status }
            color={ statusColor(status) }
          >
            { statusDisplay(status) }
            <Label.Detail>
              { assignments.filter(assignment => assignment.status === status).length }
            </Label.Detail>
          </Label>
        ))}
      </Content>
    </Modal>
  );
};