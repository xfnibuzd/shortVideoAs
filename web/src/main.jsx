import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import ProjectList from './pages/ProjectList.jsx';
import Workbench from './pages/Workbench.jsx';

const router = createBrowserRouter([
  { path: '/', element: <ProjectList /> },
  { path: '/project/:projectId', element: <Workbench /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
