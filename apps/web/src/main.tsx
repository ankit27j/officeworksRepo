import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { createServices } from './api/services';
import { App } from './app/App';
import { routes } from './app/routes';
import { RootStore } from './stores/RootStore';
import './styles/global.css';

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined; // Blocked storage (e.g. some privacy modes).
  }
}

const store = new RootStore(createServices(), {
  storage: browserStorage(),
  prefersDark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
});
const router = createBrowserRouter(routes);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <App store={store} router={router} />
  </StrictMode>,
);
