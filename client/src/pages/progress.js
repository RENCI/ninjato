import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tab, Menu, Loader } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { VolumeProgress } from 'modules/progress/components/volume-progress';
import { api } from 'utils/api';
import { lineChart, stackedArea } from 'vega-specs';

const getUserTimelines = (users, volumes) => {
  const timelines = users.map(user => ({ user: user, timeline: [] }));

  volumes.forEach(({ history }) => Object.values(history)
    .forEach(assignmentHistory => {            
      let currentUser = null;
      assignmentHistory.forEach((action,) => {
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

          currentUser.timeline.push(action);
          
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
        declined: 0,
        reviewDeclined: 0
      } : {...counts[i - 1]};

      count.time = new Date(action.time);

      switch (action.type) {
        case 'annotation_assigned_to': if (i === 0) count.active++; break;
        case 'annotation_completed_by': count.active--; count.review++; break;
        case 'annotation_rejected_by': count.active--; count.declined++; break;
        case 'review_assigned_to': break;
        case 'review_completed_by': count.review--; count.active++; break;
        case 'review_verified_by': count.review--; count.completed++; break;
        case 'review_rejected_by': count.review--; count.reviewDeclined++; break;
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
  const [{ user }] = useContext(UserContext);
  const [users, setUsers] = useState();
  const [volumes, setVolumes] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const getData = async () => {
      const users = await api.getUsers();
      setUsers(users);

      const volumes = await api.getVolumes();
      setVolumes(volumes);
    }
    
    getData();
  }, []);

  return (
    !user ?
      <RedirectMessage message='No User' />
    : !volumes ? 
      <Loader active />
    :
      <Tab
        menu={{ secondary: true, pointing: true, attached: 'top' }}
        panes={[
          {
            menuItem: <Menu.Item>Volumes</Menu.Item>,
            render: () => 
              <Tab
                menu={{ secondary: true, pointing: true, attached: 'top '}}
                panes={ volumes.map(volume => ({    
                  menuItem: <Menu.Item>{ volume.name }</Menu.Item>,
                  render: () =>
                    <VolumeProgress volume={ volume } users={ users } />
                }))}
              />
          },
          {
            menuItem: <Menu.Item>Users</Menu.Item>,
            render: () => 'users'
          }
        ]}
      />     
  );
};