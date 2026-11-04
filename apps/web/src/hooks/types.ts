import type { AsyncState } from '../stores/utils/AsyncResource';

/**
 * What every data hook returns: a plain snapshot of the state plus a way to try again after an error.
 * Call data hooks from observer components; components further down only receive plain values.
 */
export interface ResourceHook<T> {
  state: AsyncState<T>;
  retry: () => void;
}
