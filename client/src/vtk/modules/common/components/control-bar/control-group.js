import { Button } from 'semantic-ui-react';

export const ControlGroup = ({ children }) => {
  return (
    <Button.Group vertical>
      { children }
    </Button.Group>
  );
};
