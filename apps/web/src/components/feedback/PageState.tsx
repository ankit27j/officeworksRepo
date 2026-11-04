import { Button, Empty, Result, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import type { AsyncState } from '../../stores/utils/AsyncResource';

interface PageStateProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  onRetry?: () => void;
  /** Shown instead of the generic error when the API says NOT_FOUND. */
  notFound?: ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
}

/**
 * One place for loading / error / not found / empty handling, so every page behaves the same.
 * Renders `children(data)` only once data has loaded.
 */
export function PageState<T>({ state, children, onRetry, notFound, isEmpty, emptyText }: PageStateProps<T>) {
  if (state.status === 'error' && state.error) {
    if (state.error.isNotFound && notFound) return <>{notFound}</>;
    return (
      <Result
        status="warning"
        title="Something went wrong"
        subTitle={state.error.message}
        extra={
          onRetry && (
            <Button type="primary" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  if (state.status !== 'success' || state.data === undefined) {
    return (
      <div role="status" aria-live="polite" aria-label="Loading">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (isEmpty?.(state.data)) return <Empty description={emptyText} />;
  return <>{children(state.data)}</>;
}
