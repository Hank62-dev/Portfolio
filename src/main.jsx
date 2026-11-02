import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { startUpdates } from './lib/appUpdate';

// Reveal-on-scroll only hides content once we know JS is running (see styles/index.css).
document.documentElement.classList.add('js');

startUpdates();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
