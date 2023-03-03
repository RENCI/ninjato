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

const binCounts = (timeline, binDates) => {
  if (!timeline || timeline?.counts.length === 0 || !binDates || binDates.length === 0) return;

  const copyCounts = (a, b, keys) => keys.forEach(key => a[key] = b[key]);

  // Create bins
  const first = timeline.counts[0];
  const keys = Object.keys(first).filter(key => key !== 'time');
  const bins = binDates.map(date => {
    const bin = {};
    keys.forEach(key => bin[key] = 0);
    bin.time = date;
    return bin;
  });

  let countIndex = 0;
  bins.forEach(bin => {
    for (; countIndex < timeline.counts.length; countIndex++) {
      if (countIndex > 0 && timeline.counts[countIndex].time > bin.time) {
        copyCounts(bin, timeline.counts[countIndex - 1], keys);
        return;
      }
    }

    copyCounts(bin, timeline.counts[countIndex - 1], keys);
  });

  return bins;
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

export const VolumeProgress = ({ volume, users, reviewer }) => {
  const [{ chartType, reportingDay }] = useContext(ProgressContext);
  const [volumeTimeline, setVolumeTimeline] = useState();
  const [userTimelines, setUserTimelines] = useState([]);

  useEffect(() => {
    if (volume && users) {      
      sanitizeHistory(volume);    
      setVolumeTimeline(getVolumeTimeline(volume));
      setUserTimelines(getUserTimelines(volume, users));
    }
  }, [volume, users, reviewer, reportingDay]);

  const keys = ['declined', 'reviewDeclined', 'completed', 'review', 'active'];
  const keyIndex = keys.reduce((keyIndex, key, i) => {
    keyIndex[key] = i;
    return keyIndex;
  }, {});

  const bins = useMemo(() => {
    const numWeeks = 1;

    if (!volumeTimeline || volumeTimeline?.counts.length === 0) return null;

    const addDays = (date, days) => {
      date.setDate(date.getDate() + days);
    };

    // Get end date for first bin
    const first = volumeTimeline.counts[0].time;
    const binDate = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    binDate.setDate(first.getDate() + (7 + reportingDay - first.getDay()) % 7);

    // Set to just before midnight on that day
    binDate.setHours(23, 59, 59, 999);

    // Get last date
    const last = volumeTimeline.counts[volumeTimeline.counts.length - 1].time;

    // Create bins
    const bins = [];
    while (binDate < last) {
      const newDate = new Date();
      newDate.setTime(binDate.getTime());
      bins.push(newDate);
      addDays(binDate, numWeeks * 7);
    }

    return bins;
  }, [volumeTimeline, reportingDay]);
  const binnedVolumeCounts = useMemo(() => binCounts(volumeTimeline, bins), [volumeTimeline, bins]);
  const binnedUserCounts = useMemo(() => userTimelines.map(user => ({
    user: user.user,
    counts: binCounts(user.timeline, bins)
  })), [userTimelines, bins]);

  const getLineData = () => binnedVolumeCounts ? binnedVolumeCounts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;
  
  const getAreaData = () => binnedVolumeCounts ? binnedVolumeCounts.reduce((data, count) => ([
    ...data,
    ...keys.map(key => ({ count: key.toLowerCase().includes('declined') ? -count[key] : count[key], time: count.time, status: key, order: keyIndex[key] }))
  ]), []) : null;

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