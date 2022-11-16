import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { api } from 'utils/api';

const sortActions = (a, b) => a.time - b.time;
/*
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
*/
const getTimelineCounts = timeline => 
  timeline.reduce((counts, action) => {
    /*
    const count = counts.length === 0 ? 
      { active: 0, completed: 0, declined: 0} :
      {...counts[counts.length - 1]};

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
    */
   return counts;
  }, []);

const getUserTimelines = (users, volumes) => {
  console.log(volumes);

  const timelines = users.map(user => ({ user: user, timeline: [] }));

  volumes.forEach(volume => Object.entries(volume.history)
    .forEach(([assignmentId, assignmentHistory]) => {            
      let currentUser = null;
      assignmentHistory.forEach(action => {


        // Check logic for first action here
        

        if (action.type === 'annotation_assigned_to' || 
            action.type === 'annotation_completed_by' || 
            action.type === 'annotation_rejected_by') {


          if (action.type === 'annotation_completed_by') console.log(assignmentId)

          currentUser = timelines.find(({ user }) => user.login === action.user);

          if (!currentUser) {
            console.warn(`Unknown user: ${ action.user }`);
          }
        }
        
        if (!currentUser) {
          console.warn('No current user', assignmentHistory, action);
          return;
        }
        
        currentUser.timeline.push(action);
        
        if (action.type === 'annotation_rejected_by') {
          currentUser = null;  
        }       
      });
    })
  );

  console.log(timelines);

  timelines.forEach(user => {
    user.counts = user.timeline.reduce((counts, action) => {

    }, []);
  });
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

      /*
      const timelines = users.map(user => 
        ({ 
          user: user,
          timelines: getUserTimelines(user, volumes)
        })
      );
      */

      const timelines = getUserTimelines(users, volumes);

      //console.log(timelines);
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