import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { ViewContainer } from 'modules/view/components';

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
      <ViewContainer />
    : assignment.status === 'review' ?
      <ViewContainer review={ true } />
    :
      <Message>Invalid assignment status { assignment.status }</Message>
  );
};