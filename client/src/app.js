import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider, DataProvider, ControlsProvider, ErrorProvider } from "contexts"; 
import { MainMenu } from 'components/main-menu';
import { ErrorMessage } from 'components/error-message';
import { Home } from 'pages';

export const App = () => { 
  return (
    <UserProvider>
    <DataProvider>
    <ControlsProvider>
    <ErrorProvider>
      <Router>        
        <MainMenu />
        <Routes>
          <Route exact path={'/'} element={ <Home /> } />
        </Routes>
        <ErrorMessage />
      </Router>
    </ErrorProvider>
    </ControlsProvider>
    </DataProvider>
    </UserProvider>
  );
};