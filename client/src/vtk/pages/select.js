import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { AssignmentSelection } from 'modules/assignment/components/assignment-selection';

export const Select = () => {
  const [{ user }] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    !user ? 
      <RedirectMessage message='No User' />
    : 
      <AssignmentSelection />
  );
};