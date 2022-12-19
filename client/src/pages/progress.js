import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tab, Menu } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { RedirectMessage } from 'modules/common/components/redirect-message';
import { VegaWrapper } from 'modules/vega/components/vega-wrapper';
import { api } from 'utils/api';
import { lineChart, stackedArea } from 'vega-specs';

// XXX: Necessary to fix issues in assignment history. 
// Can probably be removed after first volume (purple_box) is completed.
const sanitizeHistory = volumes => 
  volumes.forEach(({ history }) => 
    Object.values(history).forEach(assignment => {
      for (let i = 0; i < assignment.length; i++) {
        const action = assignment[i];

        action.time = new Date(action.time);

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
        else if (action.type === 'review_completed_by' && i === assignment.length - 1) {
          action.type = 'review_verified_by';
        }
      }
    })
  );

const getVolumeTimelines = volumes => {
  const timelines = volumes.map(volume => ({ volume: volume, timeline: [] }));

  volumes.forEach(({ history }, i) => {
    const timeline = timelines[i].timeline;

    Object.values(history).forEach(assignment => {
      assignment.forEach((action, i) => {
        // Only add the first annotation_assigned_to
        if (i === 0 && action.type !== 'annotation_assigned_to') {
          console.warn('Assigned to not first action: ', assignment);
        }
        else {     
          timeline.push(action);  
        }
      });
    }); 
  });

  timelines.forEach(({ timeline }) => timeline.sort((a, b) => a.time - b.time));

  timelines.forEach(volume => {
    volume.counts = volume.timeline.reduce((counts, action, i, a) => {
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
        declined: 0
      } : {...counts[i - 1]};

      count.time = new Date(action.time);

      switch (action.type) {
        case 'annotation_assigned_to': if (i === 0) count.active++; break;
        case 'annotation_completed_by': count.active--; count.review++; break;
        case 'annotation_rejected_by': count.active--; count.declined++; break;
        case 'review_assigned_to': break;
        case 'review_completed_by': count.review--; count.active++; break;
        case 'review_verified_by': count.review--; count.completed++; break;
        case 'review_rejected_by': count.review--; break;
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
  const [volumeTimelines, setVolumeTimelines] = useState();
  const [userTimelines, setUserTimelines] = useState();
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
      setVolumeTimelines(getVolumeTimelines(volumes));
      setUserTimelines(getUserTimelines(users, volumes));
    }
    
    getData();
  }, [volumes]);

  const index = 0;
  const keys = ['declined', 'completed', 'review', 'active'];
  const keyIndex = keys.reduce((keyIndex, key, i) => {
    keyIndex[key] = i;
    return keyIndex;
  }, {});

  //console.log(timelines);
  //console.log(volumes);

  const lineData = volumeTimelines ? volumeTimelines[index].counts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;

  const areaData = volumeTimelines ? volumeTimelines[index].counts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: key === 'declined' ? -count[key] : count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;

  // XXX: Look into issue with dips in stacked area chart: shouldn't happen...

  return (
    !user ?
      <RedirectMessage message='No User' />
    :
      <Tab
        menu={{ secondary: true, pointing: true, attached: 'top' }}
        panes={[
          {
            menuItem: <Menu.Item>Volumes</Menu.Item>,
            render: () => 
              <>
                <VegaWrapper spec={ lineChart } data={ lineData } />
                <VegaWrapper spec={ stackedArea } data={ areaData } />
              </>
          },
          {
            menuItem: <Menu.Item>Users</Menu.Item>,
            render: () => 'users'
          }
        ]}
      />     
  );
};