import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { 
  UserProvider, 
  DataProvider, 
  RefineProvider, 
  FlagProvider, 
  LoadingProvider,
  ErrorProvider 
} from "contexts"; 
import { MainMenu } from 'modules/menu/components/main-menu';
import { LoadingMessage } from 'modules/common/components/loading-message';
import { ErrorMessage } from 'modules/common/components/error-message';
import { Home } from 'pages';

export const App = () => { 
  return (
    <UserProvider>
    <DataProvider>
    <RefineProvider>
    <FlagProvider>
    <LoadingProvider>
    <ErrorProvider>
      <Router>        
        <MainMenu />
        <Routes>
          <Route exact path={'/'} element={ <Home /> } />
        </Routes>
        <LoadingMessage />
        <ErrorMessage />
      </Router>
    </ErrorProvider>
    </LoadingProvider>
    </FlagProvider>
    </RefineProvider>
    </DataProvider>
    </UserProvider>
  );
};