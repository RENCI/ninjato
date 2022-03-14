import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { 
  UserProvider, 
  DataProvider, 
  RefineProvider, 
  FlagProvider, 
  ErrorProvider 
} from "contexts"; 
import { MainMenu } from 'modules/menu/components/main-menu';
import { ErrorMessage } from 'modules/common/components/error-message';
import { Home } from 'pages';

export const App = () => { 
  return (
    <UserProvider>
    <DataProvider>
    <RefineProvider>
    <FlagProvider>
    <ErrorProvider>
      <Router>        
        <MainMenu />
        <Routes>
          <Route exact path={'/'} element={ <Home /> } />
        </Routes>
        <ErrorMessage />
      </Router>
    </ErrorProvider>
    </FlagProvider>
    </RefineProvider>
    </DataProvider>
    </UserProvider>
  );
};