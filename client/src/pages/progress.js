import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tab, Menu } from 'semantic-ui-react';
import { ResponsiveStream } from '@nivo/stream';
import { ResponsiveLine } from '@nivo/line';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { api } from 'utils/api';
import { render } from 'react-dom';

// XXX: Necessary to fix issues in assignment history. 
// Can probably be removed after first volume (purple_box) is completed.
const sanitizeHistory = volumes => 
  volumes.forEach(({ history }) => 
    Object.values(history).forEach(assignment => {
      for (let i = 0; i < assignment.length; i++) {
        const action = assignment[i];

        if (
          i === 0 && 
          action.type !== 'annotation_assigned_to'
        ) {
          assignment.unshift({
            ...action,
            type: 'annotation_assigned_to'
          });
        }
        else if (
          action.type === 'annotation_rejected_by' && 
          i < assignment.length - 1 && 
          assignment[i + 1].type !== 'annotation_assigned_to'
        ) {
          assignment.splice(i + 1, 0, {
            ...assignment[i + 1],
            type: 'annotation_assigned_to'
          });
        }
      }
    })
  );

const getVolumeTimelines = volumes => {
  return volumes.map(({ history }) => {
    const timeline = [];

    Object.values(history).forEach(assignment => {
      assignment.forEach((action, i, a) => {
        // XXX: Don't need this for volume if simulatinng completed status below is moved to sanitizeHistory

        const time = new Date(action.time);

        // Only add the first annotation_assigned_to
        if (action.type === 'annotation_assigned_to') {
          if (!currentUser) {
            currentUser = timelines.find(({ user }) => user.login === action.user);
  
            if (currentUser) {
              currentUser.timeline.push(action);
            }
            else {
              console.warn(`Unknown user: ${ action.user }`);
            }
          }
        }
        else {        
          if (!currentUser) {
            console.warn('No current user', assignmentHistory, action);
            return;
          }
        
          // XXX: Hack to simulate completed status until that is fixed on the server
          // XXX: Move to sanitizeHistory
          if (action.type === 'review_completed_by' && i === a.length - 1) {
            currentUser.timeline.push({...action, type: 'review_verified_by' });
          }
          else {
            currentUser.timeline.push(action);
          }
          
          if (action.type === 'annotation_rejected_by') {
            currentUser = null;  
          }       
      });
    }); 
  });
};

const getUserTimelines = (users, volumes) => {
  const timelines = users.map(user => ({ user: user, timeline: [] }));

  volumes.forEach(({ history }) => Object.values(history)
    .forEach(assignmentHistory => {            
      let currentUser = null;
      assignmentHistory.forEach((action, i, a) => {
        action.time = new Date(action.time);

        // Only add the first annotation_assigned_to
        if (action.type === 'annotation_assigned_to') {
          if (!currentUser) {
            currentUser = timelines.find(({ user }) => user.login === action.user);
  
            if (currentUser) {
              currentUser.timeline.push(action);
            }
            else {
              console.warn(`Unknown user: ${ action.user }`);
            }
          }
        }
        else {        
          if (!currentUser) {
            console.warn('No current user', assignmentHistory, action);
            return;
          }
        
          // XXX: Hack to simulate completed status until that is fixed on the server
          // XXX: Move to sanitizeHistory
          if (action.type === 'review_completed_by' && i === a.length - 1) {
            currentUser.timeline.push({...action, type: 'review_verified_by' });
          }
          else {
            currentUser.timeline.push(action);
          }
          
          if (action.type === 'annotation_rejected_by') {
            currentUser = null;  
          }       
        }
      });
    })
  );

  timelines.forEach(({ timeline }) => timeline.sort((a, b) => a.time - b.time));

  timelines.forEach(user => {
    user.counts = user.timeline.reduce((counts, action, i, a) => {
      const count = i === 0 ? {
        active: 0,
        review: 0,
        completed: 0,
        declined: 0
      } : {...counts[i - 1]};

      count.time = new Date(action.time);

      switch (action.type) {
        case 'annotation_assigned_to': count.active++; break;
        case 'annotation_completed_by': count.active--; count.review++; break;
        case 'annotation_rejected_by': count.active--; count.declined++; break;
        case 'review_assigned_to': break;
        case 'review_completed_by': count.review--; count.active++; break;
        case 'review_verified_by': count.review--; count.completed++; break;
        case 'review_rejected_by': break;
        default: 
          console.warn(`Unknown action type ${ action.type }`);
      }

      counts.push(count);

      return counts;
    }, []);
  });

  return timelines;
};

export const Progress = () => {
  const [{ user, volumes }] = useContext(UserContext);
  const [timelines, setTimelines] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const getData = async () => {
      const users = await api.getUsers();
      const volumes = await api.getVolumes();

      sanitizeHistory(volumes);

      const volumeTimelines = getVolumeTimelines(volumes);

      const timelines = getUserTimelines(users, volumes);
      console.log(timelines);

      setTimelines(timelines);
    }
    
    getData();
  }, [volumes]);

  const index = 10;
  const keys = ['active', 'review', 'completed', 'declined'];

  console.log(timelines);
  console.log(volumes);

  const data = timelines ? keys.map(key => ({
    id: key,
    data: timelines[index].counts.map((count, i) => ({ x: count.time.toISOString(), y: count[key] }))
  })) : null;

  console.log(data)

  return (
    !user ?
      <RedirectMessage message='No User' />
    :
      <Tab
        menu={{ secondary: true, pointing: true, attached: 'top' }}
        panes={[
          {
            menuItem: <Menu.Item>Volumes</Menu.Item>,
            render: () => 'volumes'
          },
          {
            menuItem: <Menu.Item>Users</Menu.Item>,
            render: () => 'users'
          }
        ]}
      />
/*
      <div style={{ height: 500 }}>
        { timelines && <>yo</>
          
          <ResponsiveLine 
            data={ keys.map(key => ({
              id: key,
              data: timelines[index].counts.map(count => ({ x: count.time.toISOString(), y: count[key] }))
            }))}
            xScale={{ 
              type: 'time',
              format: 'YYYY-MM-DDTHH:mm:ss.sssZ'
            }}
            xFormat={ 'time:YYYY-MM-DDTHH:mm:ss.sssZ' }
            axisBottom={ null }
          />
          <ResponsiveStream 
            data={ timelines[index].counts }
            keys={ ['active', 'review', 'completed', 'declined'] }
            offsetType='diverging'
            order='reverse'
            curve='monotoneY'
          />
                   
        }
      </div>
*/      
  );
};