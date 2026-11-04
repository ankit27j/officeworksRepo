import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/ApiError';
import { AsyncResource } from './AsyncResource';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AsyncResource', () => {
  it('goes idle -> loading -> success', async () => {
    const resource = new AsyncResource<number>();
    expect(resource.status).toBe('idle');

    const request = deferred<number>();
    const loading = resource.load(() => request.promise);
    expect(resource.status).toBe('loading');

    request.resolve(42);
    await loading;
    expect(resource.status).toBe('success');
    expect(resource.data).toBe(42);
  });

  it('turns any failure into an ApiError', async () => {
    const resource = new AsyncResource<number>();
    await resource.load(() => Promise.reject(new Error('boom')));

    expect(resource.status).toBe('error');
    expect(resource.error).toBeInstanceOf(ApiError);
    expect(resource.error?.message).toBe('boom');
  });

  it('ignores a slow response that arrives after a newer one (latest wins)', async () => {
    const resource = new AsyncResource<string>();
    const slow = deferred<string>();
    const fast = deferred<string>();

    const first = resource.load(() => slow.promise);
    const second = resource.load(() => fast.promise);
    fast.resolve('new');
    await second;
    slow.resolve('old');
    await first;

    expect(resource.data).toBe('new');
  });

  it('ensureLoaded only fetches once', async () => {
    const resource = new AsyncResource<number>();
    let calls = 0;
    const fetcher = async () => ++calls;

    await resource.ensureLoaded(fetcher);
    await resource.ensureLoaded(fetcher);

    expect(calls).toBe(1);
  });

  it('ensureLoaded fetches again after an error', async () => {
    const resource = new AsyncResource<number>();
    await resource.load(() => Promise.reject(new Error('down')));
    await resource.ensureLoaded(async () => 7);
    expect(resource.data).toBe(7);
  });
});
