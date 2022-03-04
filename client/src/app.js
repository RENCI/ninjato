import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider, DataProvider, RefineProvider, ErrorProvider } from "contexts"; 
import { MainMenu } from 'modules/menu/components/main-menu';
import { ErrorMessage } from 'modules/common/components/error-message';
import { Home } from 'pages';

export const App = () => { 
  return (
    <UserProvider>
    <DataProvider>
    <RefineProvider>
    <ErrorProvider>
      <Router>        
        <MainMenu />
        <Routes>
          <Route exact path={'/'} element={ <Home /> } />
        </Routes>
        <ErrorMessage />
      </Router>
    </ErrorProvider>
    </RefineProvider>
    </DataProvider>
    </UserProvider>
  );
};