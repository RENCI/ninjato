import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { api } from 'utils/api';

const sortActions = (a, b) => b.time - a.time;

const getUserTimelines = (user, volumes) => {
  const timelines = volumes.map(volume => 
    Object.entries(volume.history).reduce((timeline, [assignmentId, assignmentHistory]) => {
      return [
        ...timeline,
        ...assignmentHistory
          .filter(action => action.user === user.login)
          .map(action => ({ ...action, assignmentId: assignmentId }))          
      ]
    }, []).sort(sortActions)
  );

  return {
    volumes: timelines,
    combined: timelines.flat().sort(sortActions)
  }
};

export const Progress = () => {
  const [{ user, volumes }] = useContext(UserContext);
  const navigate = useNavigate();

  console.log(volumes);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const getUsers = async () => {
      const users = await api.getUsers();

      const timelines = users.map(user => 
        ({ 
          user: user,
          timelines: getUserTimelines(user, volumes)
        })
      );

      console.log(timelines);
    }
     
    if (volumes) getUsers();
  }, [volumes]);

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