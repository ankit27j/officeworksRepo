import { action, makeObservable, observable, runInAction } from 'mobx';
import { ApiError } from '../../api/ApiError';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/** Read-only view of a resource. Pages and components depend on this, never on the store internals. */
export interface AsyncState<T> {
  readonly status: LoadStatus;
  readonly data: T | undefined;
  readonly error: ApiError | undefined;
}

export const IDLE_STATE: AsyncState<never> = { status: 'idle', data: undefined, error: undefined };
export const LOADING_STATE: AsyncState<never> = { status: 'loading', data: undefined, error: undefined };

/**
 * Reads every field now and returns a plain object. Hooks call this inside the page's observer render,
 * so MobX tracks status/data/error there. Passing the live resource to a non-observer component
 * (e.g. PageState) instead would mean nothing re-renders when it changes.
 */
export function snapshot<T>(state: AsyncState<T>): AsyncState<T> {
  return { status: state.status, data: state.data, error: state.error };
}

/**
 * Loading/error/data state for one async value, shared by every store.
 * If a newer load starts, an older response that arrives later is ignored ("latest wins").
 */
export class AsyncResource<T> implements AsyncState<T> {
  status: LoadStatus = 'idle';
  data: T | undefined = undefined;
  error: ApiError | undefined = undefined;
  private latestRequest = 0;

  constructor() {
    makeObservable<AsyncResource<T>, 'begin'>(this, {
      status: observable,
      data: observable.ref,
      error: observable.ref,
      begin: action,
      reset: action,
    });
  }

  async load(fetcher: () => Promise<T>): Promise<void> {
    const request = this.begin();
    try {
      const data = await fetcher();
      if (request !== this.latestRequest) return;
      runInAction(() => {
        this.data = data;
        this.status = 'success';
      });
    } catch (error) {
      if (request !== this.latestRequest) return;
      runInAction(() => {
        this.error = ApiError.from(error);
        this.status = 'error';
      });
    }
  }

  /** Loads only if not already loaded or in flight, e.g. when a page is revisited. */
  async ensureLoaded(fetcher: () => Promise<T>): Promise<void> {
    if (this.status === 'success' || this.status === 'loading') return;
    await this.load(fetcher);
  }

  reset(): void {
    this.latestRequest++;
    this.status = 'idle';
    this.data = undefined;
    this.error = undefined;
  }

  private begin(): number {
    this.status = 'loading';
    this.error = undefined;
    return ++this.latestRequest;
  }
}
