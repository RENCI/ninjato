import { Button, Popup } from 'semantic-ui-react';

export const RefreshButton = ({ className, message = null, onClick }) => {
  const button = (
    <Button 
      basic 
      circular 
      size='tiny'
      icon='sync'    
      className={ className }     
      onClick={ onClick } 
    />
  );
  
  return (
    message ?
      <Popup
        trigger={ button }
        content={ message }
      />
    : 
      button
  );
};