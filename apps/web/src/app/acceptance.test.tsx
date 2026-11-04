import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '../stores/ThemeStore';
import { FEATURED } from '../test/fixtures';
import { errorBody } from '../test/handlers';
import { memoryStorage, renderApp } from '../test/renderApp';
import { server } from '../test/server';

/** Titles of the product tiles in a container, in display order (read from each tile's photo alt text). */
const tileTitles = (container: HTMLElement) =>
  within(container)
    .getAllByRole('link')
    .map((link) => link.querySelector('img')?.getAttribute('alt'))
    .filter(Boolean);

describe('Acceptance criteria', () => {
  it('Home: GIVEN 5 chosen "top rated" products, WHEN viewing the home page, THEN I see those 5', async () => {
    renderApp('/');

    const section = await screen.findByRole('region', { name: 'Top rated products' });
    expect(screen.getByRole('heading', { level: 1, name: 'Top rated products' })).toBeInTheDocument();
    expect(tileTitles(section)).toEqual(FEATURED.map((p) => p.title));
  });

  it('Category: WHEN I click a category link, THEN I see its top rated products AND additional products', async () => {
    const { user, router } = renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await user.click(within(nav).getByRole('link', { name: 'Electronics' }));

    // Navigation commits asynchronously: wait for the new page, then check the URL.
    expect(await screen.findByRole('heading', { level: 1, name: 'Electronics' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/category/electronics');
    expect(tileTitles(screen.getByRole('region', { name: 'Top rated' }))).toEqual([
      'Portable Hard Drive',
      'Gaming Monitor',
    ]);
    expect(tileTitles(screen.getByRole('region', { name: 'More in Electronics' }))).toEqual(['Internal SSD']);
    expect(within(nav).getByRole('link', { name: 'Electronics' })).toHaveAttribute('aria-current', 'page');
  });

  it('Search: WHEN I enter a term and click Search, THEN I only see products matching it', async () => {
    const { user, router } = renderApp('/');
    await screen.findByRole('region', { name: 'Top rated products' });

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'jacket');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “jacket”' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/search');
    expect(router.state.location.search).toBe('?q=jacket');
    expect(await screen.findByText('2 products found')).toBeInTheDocument();
    // Title match and description match ("Pairs well with a jacket"); nothing else.
    expect(tileTitles(screen.getByRole('main'))).toEqual(['Mens Cotton Jacket', 'Casual Shirt']);
  });

  it('Search: tells me when nothing matches', async () => {
    renderApp('/search?q=unicorn');
    expect(await screen.findByText('No products match “unicorn”. Try a different word.')).toBeInTheDocument();
  });

  it('Search: the button does nothing until a term is entered', async () => {
    renderApp('/');
    expect(await screen.findByRole('button', { name: 'Search' })).toBeDisabled();
  });

  it('Product: WHEN I click a product tile, THEN I see the product details page', async () => {
    const { user, router } = renderApp('/');

    const section = await screen.findByRole('region', { name: 'Top rated products' });
    await user.click(within(section).getByRole('img', { name: 'Mens Cotton Jacket' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/product/1');
    expect(screen.getByText('$55.99')).toBeInTheDocument();
    expect(screen.getByText('Warm outerwear for spring and autumn')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 4.7 out of 5 from 100 reviews' })).toBeInTheDocument();
  });
});

describe('Resilience and edge cases', () => {
  it('shows an error with a working retry when the API fails', async () => {
    server.use(
      http.get(
        '*/api/v1/catalog/featured',
        () =>
          HttpResponse.json(errorBody('UPSTREAM_UNAVAILABLE', 'Product data is unavailable'), {
            status: 502,
          }),
        { once: true },
      ),
    );
    const { user } = renderApp('/');

    expect(await screen.findByText('Product data is unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('region', { name: 'Top rated products' })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown product', async () => {
    renderApp('/product/999');
    expect(await screen.findByText('Product not found')).toBeInTheDocument();
  });

  it('shows "not found" for an unknown category', async () => {
    renderApp('/category/hats');
    expect(await screen.findByText('Category not found')).toBeInTheDocument();
  });

  it('shows "not found" for an unknown URL', async () => {
    renderApp('/nope');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('toggles dark mode and remembers the choice', async () => {
    const storage = memoryStorage();
    const { user } = renderApp('/', { storage });

    const toggle = await screen.findByRole('switch', { name: 'Dark mode' });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
  });

  it('starts in the saved mode', async () => {
    renderApp('/', { storage: memoryStorage({ [THEME_STORAGE_KEY]: 'dark' }) });
    expect(await screen.findByRole('switch', { name: 'Dark mode' })).toBeChecked();
  });
});
