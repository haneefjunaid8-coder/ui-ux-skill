import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { LandingPage } from '../pages/LandingPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';

/** Route tree for ROOT-X. Exported so tests can mount it with a memory router. */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      {
        // Lazily loaded so the design-system reference page stays out of the first-load bundle.
        path: 'design-system',
        lazy: async () => {
          const { DesignSystemPage } = await import('../pages/DesignSystemPage');
          return { Component: DesignSystemPage };
        },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
