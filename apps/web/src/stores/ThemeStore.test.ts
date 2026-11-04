import { describe, expect, it } from 'vitest';
import { memoryStorage } from '../test/renderApp';
import { THEME_STORAGE_KEY, ThemeStore } from './ThemeStore';

describe('ThemeStore', () => {
  it('follows the OS preference until the user chooses', () => {
    expect(new ThemeStore({ storage: memoryStorage(), prefersDark: true }).mode).toBe('dark');
    expect(new ThemeStore({ storage: memoryStorage(), prefersDark: false }).mode).toBe('light');
  });

  it('prefers the saved choice over the OS preference', () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: 'light' });
    expect(new ThemeStore({ storage, prefersDark: true }).mode).toBe('light');
  });

  it('ignores a corrupt saved value', () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: 'purple' });
    expect(new ThemeStore({ storage, prefersDark: false }).mode).toBe('light');
  });

  it('toggles and saves the choice', () => {
    const storage = memoryStorage();
    const store = new ThemeStore({ storage, prefersDark: false });

    store.toggle();

    expect(store.mode).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('still works when storage throws (blocked or private mode)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = new ThemeStore({ storage: throwing, prefersDark: false });

    expect(() => store.toggle()).not.toThrow();
    expect(store.mode).toBe('dark');
  });
});
