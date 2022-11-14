import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { api } from 'utils/api';

const sortActions = (a, b) => a.time - b.time;

const getUserTimelines = (user, volumes) => {
  const timelines = volumes.map(volume => 
    Object.entries(volume.history).reduce((timeline, [assignmentId, assignmentHistory]) => {
      return [
        ...timeline,
        ...assignmentHistory
          .filter(action => action.user === user.login)
          .map(action => ({ ...action, time: new Date(action.time), assignmentId: assignmentId }))          
      ]
    }, []).sort(sortActions)
  );

  return {
    volumes: timelines,
    combined: timelines.flat().sort(sortActions)
  }
};

const getTimelineCounts = timeline => 
  timeline.reduce((counts, action) => {
    const count = counts.length === 0 ? 
      { active: 0, completed: 0, declined: 0} :
      {}...counts[counts.length - 1]};

    const current = 

    if (counts.length === 0) {
      counts.push({ 
        time: action.time,
        active: 0,
        completed: 0,
        declined: 0
      });
    }
    else {
      const previous = c
      counts.push
    }
  }, []);

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