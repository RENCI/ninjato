import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { RefineContainer } from 'modules/refine/components/refine-container';

export const Assignment = () => {
  const [{ user, assignment }] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/');
    else if (!assignment) navigate('/select');
  });

  return (
    !user ? 
      <RedirectMessage message='No User' /> 
    : !assignment ? 
      <RedirectMessage message='No Assignment' /> 
    : assignment.status === 'active' ? 
      <RefineContainer />
    : assignment.status === 'review' ?
      <Message>REVIEW INTERFACE GOES HERE</Message>
    :
      <Message>Unknown assignment type { assignment.type }</Message>
  );
};