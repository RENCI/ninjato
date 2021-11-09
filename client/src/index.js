import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import axios from 'axios';
import 'semantic-ui-css/semantic.min.css';
import store from './store';
import { App } from './app';

axios.defaults.baseURL = '/api/v1';

const GirderApp = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
);

ReactDOM.render(
  <GirderApp />,
  document.getElementById('root'));

export default GirderApp;
