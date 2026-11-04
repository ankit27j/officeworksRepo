/**
 * Port for a key/value cache with expiry. Async so a shared cache (Redis/ElastiCache) can replace
 * the in-memory adapter when the API runs on more than one instance.
 */
export abstract class CacheStore {
  abstract get<T>(key: string): Promise<T | undefined>;
  abstract set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}
