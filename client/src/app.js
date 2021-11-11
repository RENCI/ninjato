import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider, DataProvider } from "./contexts"; 
import { MainMenu } from './components/main-menu';
import { Home } from './pages';

export const App = () => { 
  return (
    <UserProvider>
    <DataProvider>
      <Router>        
        <MainMenu />
        <Routes>
          <Route exact path={'/'} element={ <Home /> } />
        </Routes>
      </Router>
    </DataProvider>
    </UserProvider>
  );
};