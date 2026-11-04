import { CacheStore } from './cache-store.port';

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** Single-process cache. Fine for one API instance; swap for Redis when scaling out. */
export class MemoryCache extends CacheStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {
    super();
  }

  override async get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  override async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      this.entries.delete(key);
      return;
    }
    this.entries.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
  }
}
