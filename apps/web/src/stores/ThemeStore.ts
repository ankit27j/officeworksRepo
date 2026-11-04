import { action, makeObservable, observable } from 'mobx';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'catalogue.theme';

export interface ThemeEnvironment {
  /** Browser storage, if available. Access can throw (private mode, blocked storage). */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  /** The OS / browser preference, used until the user picks a mode. */
  prefersDark: boolean;
}

/** Light/dark mode. Remembers the user's choice; otherwise follows their OS preference. */
export class ThemeStore {
  mode: ThemeMode;

  constructor(private readonly env: ThemeEnvironment) {
    this.mode = this.readSaved() ?? (env.prefersDark ? 'dark' : 'light');
    makeObservable(this, { mode: observable, setMode: action, toggle: action });
  }

  get isDark(): boolean {
    return this.mode === 'dark';
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    try {
      this.env.storage?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  }

  toggle(): void {
    this.setMode(this.isDark ? 'light' : 'dark');
  }

  private readSaved(): ThemeMode | undefined {
    try {
      const saved = this.env.storage?.getItem(THEME_STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : undefined;
    } catch {
      return undefined;
    }
  }
}
