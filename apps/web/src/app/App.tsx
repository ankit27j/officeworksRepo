import { type DataRouter, RouterProvider } from 'react-router';
import type { RootStore } from '../stores/RootStore';
import { StoreProvider } from '../stores/StoreProvider';
import { AppThemeProvider } from '../theme/AppThemeProvider';

/** Providers in one place. The store and router are passed in, so tests can supply their own. */
export function App({ store, router }: { store: RootStore; router: DataRouter }) {
  return (
    <StoreProvider store={store}>
      <AppThemeProvider>
        <RouterProvider router={router} />
      </AppThemeProvider>
    </StoreProvider>
  );
}
