/** Every URL in the app, so links and routes can't drift apart. */
export const paths = {
  home: () => '/',
  category: (slug: string) => `/category/${encodeURIComponent(slug)}`,
  product: (id: string) => `/product/${encodeURIComponent(id)}`,
  search: (term: string) => `/search?${new URLSearchParams({ q: term }).toString()}`,
} as const;
