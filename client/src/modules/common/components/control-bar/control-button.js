import { Button } from 'semantic-ui-react';

export const ControlButton = ({ 
  toggle = false, 
  icon, 
  active = false,
  disabled = false,
  onClick 
}) => {
  return (
    <Button
      toggle={ toggle }
      icon={ icon }
      color={ active ? 'grey' : null }
      disabled={ disabled }
      onClick={ onClick } 
    />
  );
};
