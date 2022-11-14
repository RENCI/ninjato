import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';

export const Administration = () => {
  const [{ user }] = useContext(UserContext);
  const navigate = useNavigate();

  //const valid = user?.reviewer;
  const valid = user;

  useEffect(() => {
    if (!valid) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    !valid ? 
      <RedirectMessage message='Not reviewer' />
    : 
      <>
        Hello
      </>
  );
};