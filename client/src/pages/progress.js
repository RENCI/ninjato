import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { api } from 'utils/api';

export const Progress = () => {
  const [{ user }] = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {

    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const getUsers = async () => {
      await api.getUsers();
    }
     
    getUsers();
  }, []);

  return (
    !user ?
      <RedirectMessage message='No User' />
    :
      <>
        <div>user progress</div>
        { /*user.reviewer*/user && 
          <div>all progress</div>
        }
      </>
  );
};