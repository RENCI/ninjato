import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  UserProvider, 
  AnnotateProvider, 
  LoadingProvider,
  ErrorProvider 
} from "contexts"; 
import { MainMenu } from 'modules/menu/components/main-menu';
import { LoadingMessage } from 'modules/common/components/loading-message';
import { ErrorMessage } from 'modules/common/components/error-message';
import { Home, Select, Assignment } from 'pages';

export const App = () => { 
  // Prevent space bar from scrolling page
  window.addEventListener('keydown', function(evt) {
    if ((evt.code === 'Space' || evt.code === 'ArrowUp' || evt.code === 'ArrowDown') && evt.target === document.body) {
      evt.preventDefault();
    }
  });

  return (
    <UserProvider>
    <AnnotateProvider>
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
    </AnnotateProvider>
    </UserProvider>
  );
};