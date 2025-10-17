// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/globals.css';

import App from './App';
import Shell from './components/Shell';
import { Login } from './pages/Login'
import Assistente from './pages/Assistente';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <App />, // gate
    children: [
      {
        element: <Shell />, // layout com header + <Outlet/>
        children: [
          { path: '/', element: <Assistente /> },
          { path: '/assistente', element: <Assistente /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
