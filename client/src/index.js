import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import 'semantic-ui-css/semantic.min.css';
import { App } from './app';
import './index.css';

axios.defaults.baseURL = '/api/v1';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);