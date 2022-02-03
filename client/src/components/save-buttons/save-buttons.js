import { useState } from 'react';
import { Segment } from 'semantic-ui-react';
import { DeclineButton } from './decline-button';
import { SaveButton } from './save-button';
import { SubmitButton } from './submit-button';

export const SaveButtons = () => {
  const [busy, setBusy] = useState(false);

  const onBusy = busy => {
    setBusy(busy);
  };

  return (
    <Segment basic textAlign='center'>
      <span style={{ margin: 20 }} >
        <DeclineButton 
          disabled={ busy } 
        />
      </span>
      <SaveButton  
        disabled={ busy }
        onSaving={ onBusy }
      />
      <SubmitButton disabled={ busy } />
    </Segment>
  );
};
