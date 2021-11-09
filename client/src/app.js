import React from 'react';
import { Route } from 'react-router-dom';
import { UserProvider } from "./contexts"; 
import { MainMenu } from './components/main-menu';
import { Home } from './pages';

export const App = () => { 
  return (
    <UserProvider>
      <MainMenu />
      <Route exact path={'/'}><Home /></Route>;
    </UserProvider>
  );
};