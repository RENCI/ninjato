import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Segment, Message, Container, Header } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RefineContainer } from 'modules/refine/components/refine-container';

export const Assignment = () => {
  const [{ user, assignment }] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/');
    else if (!assignment) navigate('/select');
  });

  return (
    !user ? <Container textAlign='center'><Segment basic><Header>No user</Header></Segment></Container> :
    !assignment ? null 
    : assignment.type === 'refine' ? 
      <RefineContainer />
    : 
      <Message>Unknown assignment type { assignment.type }</Message>
  );
};