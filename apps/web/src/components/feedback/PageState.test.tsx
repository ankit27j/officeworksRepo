import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/ApiError';
import type { AsyncState } from '../../stores/utils/AsyncResource';
import { PageState } from './PageState';

const state = <T,>(partial: Partial<AsyncState<T>>): AsyncState<T> => ({
  status: 'idle',
  data: undefined,
  error: undefined,
  ...partial,
});

describe('PageState', () => {
  it('shows a loading placeholder until data arrives', () => {
    render(<PageState state={state<string>({ status: 'loading' })}>{(data) => data}</PageState>);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('renders children with the data on success', () => {
    render(
      <PageState state={state({ status: 'success', data: 'hello' })}>{(data) => <p>{data}</p>}</PageState>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows the error message and a retry button', async () => {
    const onRetry = vi.fn();
    render(
      <PageState
        state={state<string>({ status: 'error', error: new ApiError('TIMEOUT', 'Too slow') })}
        onRetry={onRetry}
      >
        {(data) => data}
      </PageState>,
    );

    expect(screen.getByText('Too slow')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the not-found view for NOT_FOUND errors', () => {
    render(
      <MemoryRouter>
        <PageState
          state={state<string>({ status: 'error', error: new ApiError('NOT_FOUND', 'Nope', 404) })}
          notFound={<p>Gone</p>}
        >
          {(data) => data}
        </PageState>
      </MemoryRouter>,
    );
    expect(screen.getByText('Gone')).toBeInTheDocument();
  });

  it('shows the empty message when isEmpty says so', () => {
    render(
      <PageState
        state={state({ status: 'success', data: [] as string[] })}
        isEmpty={(d) => d.length === 0}
        emptyText="Nothing"
      >
        {() => <p>list</p>}
      </PageState>,
    );
    expect(screen.getByText('Nothing')).toBeInTheDocument();
    expect(screen.queryByText('list')).not.toBeInTheDocument();
  });
});
