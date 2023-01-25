import { useContext } from 'react';
import { Button, Modal, Tab, Menu, Header } from 'semantic-ui-react';
import { UserContext, SET_ACTIVE_REGION } from 'contexts';
import { CommentHistory } from 'modules/comment/components/comment-history';
import { RegionIcon } from 'modules/region/components/region-icon';

const { Content } = Modal;

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
  });

  return timelines;
};


export const VolumeProgress = volume => {
  const [timeline, setTimeline] = useState();

  return (
    <>
      <VegaWrapper spec={ lineChart } data={ lineData } />
      <VegaWrapper spec={ stackedArea } data={ areaData } />
    </>
  );
};