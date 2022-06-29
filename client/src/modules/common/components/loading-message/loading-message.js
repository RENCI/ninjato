import { useContext } from 'react';
import { Dimmer, Loader } from 'semantic-ui-react';
import { LoadingContext } from 'contexts';

export const LoadingMessage = () => {
  const [{ message }] = useContext(LoadingContext);

  return (
    <Dimmer 
      page
      active={ message !== null }
    >
      <Loader content={ message } />
    </Dimmer>
  );
};