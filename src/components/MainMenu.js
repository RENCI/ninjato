import React from 'react';
import { Container, Menu } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import UserControlsContainer from '../containers/UserControlsContainer';

const MainMenu = () => (
  <Menu stackable borderless inverted attached size='large'>
    <Container>
      <Menu.Item as={Link} to='/' header content='NINJATO'></Menu.Item>
      <Menu borderless inverted floated='right'>
        <UserControlsContainer />
      </Menu>
    </Container>
  </Menu>
);

export default MainMenu;
