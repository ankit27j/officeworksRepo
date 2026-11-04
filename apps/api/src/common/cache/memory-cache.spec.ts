import { MemoryCache } from './memory-cache';

describe('MemoryCache', () => {
  let now = 0;
  const cache = new MemoryCache(() => now);

  beforeEach(() => {
    now = 1_000;
  });

  it('returns a value until its TTL expires', async () => {
    await cache.set('k', { a: 1 }, 10);
    now += 9_999;
    expect(await cache.get('k')).toEqual({ a: 1 });
    now += 1;
    expect(await cache.get('k')).toBeUndefined();
  });

  it('does not store values with a non-positive TTL', async () => {
    await cache.set('zero', 'v', 0);
    expect(await cache.get('zero')).toBeUndefined();
  });

  it('keeps values with an infinite TTL', async () => {
    await cache.set('forever', 'v', Number.POSITIVE_INFINITY);
    now += 10 ** 12;
    expect(await cache.get('forever')).toBe('v');
  });
});
