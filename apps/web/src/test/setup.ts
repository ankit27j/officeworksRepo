import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { receivedEnquiries } from './handlers';
import { server } from './server';

// jsdom lacks these browser APIs, which Ant Design uses for responsive behaviour.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// Ant Design's Typography ellipsis measures text with ResizeObserver; jsdom has no layout engine.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// React Router's <ScrollRestoration> scrolls on navigation; jsdom has no layout to scroll.
window.scrollTo = () => undefined;

// jsdom doesn't implement getComputedStyle for pseudo-elements, which Ant Design asks for; ignore that argument.
const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element) => getComputedStyle(element);

// jsdom swaps in its own AbortSignal, but Request is still Node's (undici), which rejects any other
// AbortSignal. React Router builds a Request with a signal on every navigation, so in jsdom every
// navigation would throw. Dropping the signal is safe here: the app has no route loaders to abort.
// Browsers are unaffected; this only bridges the two test-environment implementations.
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _jsdomSignal, ...rest } = init;
      super(input, rest);
    } else {
      super(input, init);
    }
  }
};

// Fail on any request without a handler, so a test can't silently hit the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  receivedEnquiries.length = 0;
  cleanup();
});
afterAll(() => server.close());
