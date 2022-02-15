import { Dimmer, Loader } from 'semantic-ui-react';

export const VisualizationLoader = ({ loading }) => (
  <Dimmer active={ loading } page>
    <Loader>Loading</Loader>
  </Dimmer>
);
