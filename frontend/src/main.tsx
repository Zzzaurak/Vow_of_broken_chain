import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { StartPage } from './pages/StartPage';
import { GamePage } from './pages/GamePage';
import './styles.css';
import { AudioLifecycle } from './features/audio/AudioLifecycle';
const router = createBrowserRouter([
  {
    element: (
      <>
        <AudioLifecycle />
        <Outlet />
      </>
    ),
    children: [
      { path: '/', element: <StartPage /> },
      { path: '/game', element: <GamePage /> },
    ],
  },
]);
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
