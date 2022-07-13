import { useContext } from 'react';
import { UserContext } from 'contexts';
import { Assignments } from 'modules/assignment/components/assignments';
import { Volumes } from 'modules/assignment/components/volumes';
import { hasActive } from 'utils/assignment-utils';

export const RefineSelection = ({ assignments }) => {
  const [{ volumes }] = useContext(UserContext);

  const active = hasActive(assignments);
  const available = volumes && volumes.filter(({ annotations }) => annotations.available > 0).length > 0;

  const assignmentHeader = assignments.length > 0 ? 'Current assignments' : 'No current assignments';
  const assignmentSubheader = active ? 'Select an active assignment to continue' :
    available ? 'No active assignments, select an available volume below to request a new assignment' :
    'No active assignments';

  const volumeHeader = volumes && volumes.length > 0 ? 'Volumes' : 'No volumes';
  const volumeSubheader = !volumes || volumes.length === 0 ? null :
    active ? 'Complete any active assignments before requesting a new assignment' :
    available ? 'Select an available volume to request a new assignment' :
    'No volumes available';

  return (
    <>
      <Assignments 
        type='refine' 
        header={ assignmentHeader }
        subheader={ assignmentSubheader }
        assignments={ assignments } 
      />
      <Volumes 
        header={ volumeHeader }
        subheader={ volumeSubheader }
        volumes={ volumes } 
        enabled={ !active }
      />
    </>
  )
};