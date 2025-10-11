import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Conversations from '../pages/Conversations';
import Reports from '../pages/Reports';
import KB from '../pages/KB';
import Links from '../pages/Links';
import AdminAuth from '../pages/AdminAuth';
import PublicAvatar from '../pages/PublicAvatar';

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AdminAuth />,
  },
  {
    path: '/avatar/:slug',
    element: <PublicAvatar />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'leads',
        element: <Leads />,
      },
      {
        path: 'conversations',
        element: <Conversations />,
      },
      {
        path: 'reports',
        element: <Reports />,
      },
      {
        path: 'kb',
        element: <KB />,
      },
      {
        path: 'links',
        element: <Links />,
      },
    ],
  },
]);
