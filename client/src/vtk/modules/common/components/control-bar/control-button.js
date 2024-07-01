import { Button } from 'semantic-ui-react';
import { ControlPopup } from './control-popup';

export const ControlButton = ({ 
  toggle = false, 
  icon,
  tooltip = null, 
  active = false,
  disabled = false,
  onClick 
}) => {
  const button = (
    <Button
      toggle={ toggle }
      icon={ icon }
      color={ active ? 'grey' : null }
      disabled={ disabled }
      onClick={ onClick } 
    />
  );

  return (
    <>
      { tooltip ? 
        <ControlPopup content={ tooltip } trigger={ button } />
      :
        <>{ button }</>
      }
    </>
  );
};
