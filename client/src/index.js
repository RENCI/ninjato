import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import axios from 'axios';
import 'semantic-ui-css/semantic.min.css';
import { App } from './app';

axios.defaults.baseURL = '/api/v1';

const GirderApp = () => (
  <Router>
    <App />
  </Router>
);

ReactDOM.render(
  <GirderApp />,
  document.getElementById('root'));

export default GirderApp;
