import { useState } from 'react';
import { Segment, Button } from 'semantic-ui-react';
import { DeclineButton } from './decline-button';
import { SaveButton } from './save-button';
import { SubmitButton } from './submit-button';
import styles from './styles.module.css';

export const SaveButtons = () => {
  const [busy, setBusy] = useState(false);

  const onBusy = busy => {
    setBusy(busy);
  };

  return (
    <Segment basic textAlign='center' className={ styles.saveButtons }>
      <DeclineButton 
        disabled={ busy } 
      />
      <Button.Group>
        <SaveButton  
          disabled={ busy }
          onSaving={ onBusy }
        />
        <SubmitButton disabled={ busy } />
      </Button.Group>
    </Segment>
  );
};
