import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  UserProvider, 
  RefineProvider, 
  LoadingProvider,
  ErrorProvider 
} from "contexts"; 
import { MainMenu } from 'modules/menu/components/main-menu';
import { LoadingMessage } from 'modules/common/components/loading-message';
import { ErrorMessage } from 'modules/common/components/error-message';
import { Home, Select, Assignment } from 'pages';

export const App = () => { 
  return (
    <UserProvider>
    <RefineProvider>
    <LoadingProvider>
    <ErrorProvider>
      <Router>        
        <MainMenu />
        <Routes>
          <Route exact path={'/'} element={ <Home /> } />
          <Route exact path={'/select'} element={ <Select /> } />
          <Route exact path={'/assignment'} element={ <Assignment /> } />
          <Route path="*" element={ <Navigate replace to="/" /> } />
        </Routes>
        <LoadingMessage />
        <ErrorMessage />
      </Router>
    </ErrorProvider>
    </LoadingProvider>
    </RefineProvider>
    </UserProvider>
  );
};