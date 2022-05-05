import { Popup } from 'semantic-ui-react';

export const ControlPopup = (props) => {
  return (
    <Popup 
      {...props}
      inverted 
      size='tiny'
      mouseEnterDelay={1000}
    />
  );
};
