import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import 'semantic-ui-css/semantic.min.css';
import { App } from './app';
import './index.css';

axios.defaults.baseURL = '/api/v1';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);