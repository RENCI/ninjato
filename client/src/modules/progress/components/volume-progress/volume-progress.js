import { useContext, useEffect, useState, useMemo } from 'react';
import { ProgressContext } from 'contexts';
import { VolumeControls } from './volume-controls';
import { VegaWrapper } from 'modules/vega/components/vega-wrapper';
import { UserTable } from 'modules/progress/components/user-table';
import { lineChart, stackedArea } from 'vega-specs';

// XXX: Necessary to fix issues in assignment history. 
// Can probably be removed after first volume (purple_box) is completed.
const sanitizeHistory = volume => {
  Object.values(volume.history).forEach(assignment => {
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
  });
};

const processTimeline = timeline => {
  timeline.sort((a, b) => a.time - b.time);

  timeline.counts = timeline.reduce((counts, action, i) => {
    const count = i === 0 ? {
      active: 0,
      review: 0,
      completed: 0,
      declined: 0,
      reviewDeclined: 0
    } : {...counts[i - 1]};

    count.time = new Date(action.time);

    switch (action.type) {
      case 'annotation_assigned_to': count.active++; break;
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
};

const binCounts = (timeline, binDay = 0, numWeeks = 1) => {
  if (!timeline || timeline?.counts.length === 0) return;

  const addDays = (date, days) => {
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  };

  // Get end date for first bin
  const first = timeline.counts[0];
  const binDate = new Date(first.time.getFullYear(), first.time.getMonth(), first.time.getDate());
  binDate.setDate(first.time.getDate() + (7 + binDay - first.time.getDay()) % 7);

  // Create first bin
  const keys = Object.keys(first).filter(key => key !== 'time');
  const startBin = {};
  keys.forEach(key => startBin[key] = 0);
  startBin.time = binDate;  

  const binCounts = timeline.counts.reduce((bins, counts) => {
    if (counts.time > bins[bins.length - 1].time) {   
      // Create a new bin for this date
      const newBin = {...bins[bins.length - 1]};
      newBin.time = new Date(newBin.time);
      addDays(newBin.time, numWeeks * 7);
      bins.push(newBin);
    }   

    keys.forEach(key => bins[bins.length - 1][key] = counts[key]);

    return bins;    
  }, [startBin]);

  return binCounts;
};

const getVolumeTimeline = volume => {
  const timeline = [];

  Object.values(volume.history).forEach(assignment => {
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

  processTimeline(timeline);
  binCounts(timeline, 0, 1);

  return timeline;
};  

const getUserTimelines = (volume, users) => {
  const timelines = users.map(user => ({ user: user, timeline: [] }));

  Object.values(volume.history).forEach(assignmentHistory => {            
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
  });

  timelines.forEach(({ timeline }) => processTimeline(timeline));

  return timelines;
};

export const VolumeProgress = ({ volume, users }) => {
  const [{ chartType, reportingDay }] = useContext(ProgressContext);
  const [volumeTimeline, setVolumeTimeline] = useState();
  const [userTimelines, setUserTimelines] = useState([]);

  useEffect(() => {
    if (volume && users) {
      sanitizeHistory(volume);    

      setVolumeTimeline(getVolumeTimeline(volume));
      setUserTimelines(getUserTimelines(volume, users));
    }
  }, [volume, users, reportingDay]);

  const keys = ['declined', 'reviewDeclined', 'completed', 'review', 'active'];
  const keyIndex = keys.reduce((keyIndex, key, i) => {
    keyIndex[key] = i;
    return keyIndex;
  }, {});

  const binnedVolumeCounts = useMemo(() => binCounts(volumeTimeline, reportingDay, 1), [volumeTimeline, reportingDay]);
  const binnedUserCounts = useMemo(() => userTimelines.map(user => ({
    user: user.user,
    counts: binCounts(user.timeline)
  })), [userTimelines, reportingDay]);

  console.log(binnedUserCounts);

  const getLineData = () => binnedVolumeCounts ? binnedVolumeCounts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;
  
  const getAreaData = () => binnedVolumeCounts ? binnedVolumeCounts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: key.includes('declined') ? -count[key] : count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;

  return (
    !binnedVolumeCounts ? null : 
    <div style={{ margin: '20px' }}>
      <VolumeControls />
      { chartType === 'area' ?
        <VegaWrapper 
          key={ 'area' }
          spec={ stackedArea } 
          data={ getAreaData() } 
        />
      :
        <VegaWrapper 
          key={ 'line' }
          spec={ lineChart } 
          data={ getLineData() } 
        />
      }
      <UserTable users={ binnedUserCounts } />
    </div>
  );
};