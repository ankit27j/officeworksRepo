import { render } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { createServices } from '../api/services';
import { App } from '../app/App';
import { routes } from '../app/routes';
import { RootStore } from '../stores/RootStore';

/** In-memory stand-in for localStorage. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

/**
 * Renders the whole app (real stores, services, router and theme) at `path`. The network is faked
 * by MSW (src/test/handlers.ts), so these tests cover the UI end to end down to the HTTP boundary.
 */
export function renderApp(path = '/', options: { storage?: ReturnType<typeof memoryStorage> } = {}) {
  const storage = options.storage ?? memoryStorage();
  const store = new RootStore(createServices(), { storage, prefersDark: false });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  // Before every click, user-event checks `pointer-events` with getComputedStyle on each ancestor. jsdom
  // evaluates that against all of Ant Design's injected CSS, which made clicks inside a modal take 6–13s.
  // Tests find elements by role and label, so skipping the CSS check doesn't let them click hidden things.
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  const view = render(<App store={store} router={router} />);
  return { ...view, store, router, storage, user };
}
