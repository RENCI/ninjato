import React, { useContext } from 'react';
import { Container, Segment } from 'semantic-ui-react';
import { UserContext } from '../contexts';

export const Home = () => {
  const [{ login }] = useContext(UserContext);

  return (
    <Container>
      <Segment basic>
        <h1>Welcome { login }!</h1>
      </Segment>
    </Container>
  );
};