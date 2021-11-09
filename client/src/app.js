import React from 'react';
import { UserProvider } from "./contexts"; 
import { MainMenu } from './components/main-menu';
import RoutedContent from './components/RoutedContent';

export const App = () => { 
  return (
    <UserProvider>
      <MainMenu />
      <RoutedContent />
    </UserProvider>
  );
};
