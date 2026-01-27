import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { SocketProvider } from './contexts/SocketContext';
import { getAccessToken } from './utils/cookieHelper';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SocketProvider getToken={getAccessToken}>
        <App />
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

