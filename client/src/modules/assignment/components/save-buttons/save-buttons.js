import { useState } from 'react';
import { Segment, Button } from 'semantic-ui-react';
import { DeclineButton } from './decline-button';
import { SaveButton } from './save-button';
import { SubmitButton } from './submit-button';
import { VerifyButton } from './verify-button';
import styles from './styles.module.css';

export const SaveButtons = ({ review = false }) => {
  const [busy, setBusy] = useState(false);

  const onBusy = busy => {
    setBusy(busy);
  };

  return (
    <Segment basic textAlign='center' className={ styles.saveButtons }>
      <DeclineButton 
        disabled={ busy }
        review={ review } 
      />
      <Button.Group>
        <SaveButton  
          disabled={ busy }
          review={ review }
          onSaving={ onBusy }
        />
        <SubmitButton 
          disabled={ busy } 
          review={ review }
        />
      </Button.Group>
      { review && 
        <VerifyButton disabled={ busy } /> 
      }
    </Segment>
  );
};
