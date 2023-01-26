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
const sanitizeHistory = volume => {
  console.log(volume);
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

  return timeline;
};  

export const VolumeProgress = ({ volume, users }) => {
  const [volumeTimeline, setVolumeTimeline] = useState();
  //const [userTimelines, setUserTimelines] = useState();

  useEffect(() => {
    if (volume && users) {
      sanitizeHistory(volume);    
      setVolumeTimeline(getVolumeTimeline(volume));
    // setUserTimelines(getUserTimelines(users, volume));
    }
  }, [volume, users]);

  const keys = ['declined', 'reviewDeclined', 'completed', 'review', 'active'];
  const keyIndex = keys.reduce((keyIndex, key, i) => {
    keyIndex[key] = i;
    return keyIndex;
  }, {});
  
  const lineData = volumeTimeline ? volumeTimeline.counts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;
  
  const areaData = volumeTimeline ? volumeTimeline.counts.reduce((data, count) => {
    return [
      ...data,
      ...keys.map(key => ({ count: key.includes('declined') ? -count[key] : count[key], time: count.time, status: key, order: keyIndex[key] }))
    ]
  }, []) : null;

  return (
    lineData && areaData && 
    <>
      <VegaWrapper spec={ lineChart } data={ lineData } />
      <VegaWrapper spec={ stackedArea } data={ areaData } />
    </>
  );
};