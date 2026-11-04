import { Result } from 'antd';
import type { RouteObject } from 'react-router';
import { CategoryPage } from '../pages/CategoryPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProductPage } from '../pages/ProductPage';
import { SearchPage } from '../pages/SearchPage';
import { RootLayout } from './RootLayout';

/** Route table shared by the browser router (main.tsx) and the memory router (tests). */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    // Last resort for render errors; data errors are handled per page by PageState.
    errorElement: <Result status="error" title="Something went wrong" subTitle="Please reload the page." />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'product/:id', element: <ProductPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
