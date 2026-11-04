import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('searches the trimmed term when the button is clicked', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  ssd  ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledExactlyOnceWith('ssd');
  });

  it('searches on Enter', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'monitor{Enter}');

    expect(onSearch).toHaveBeenCalledWith('monitor');
  });

  it('does not search while typing, or for a blank term', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '   {Enter}');

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  });

  it('starts with the current term', () => {
    render(<SearchBar initialValue="jacket" onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('jacket');
  });
});
