import type { Product } from '@catalogue/contracts';

const CATEGORY_NAMES: Record<string, string> = {
  tops: 'Tops',
  shoes: 'Shoes',
};

/** Builds a valid contract Product with sensible defaults; override only what the test cares about. */
export function aProduct(overrides: Partial<Product> & { id: string }, categorySlug = 'tops'): Product {
  return {
    title: `Product ${overrides.id}`,
    description: 'A product',
    price: { amount: 10, currency: 'AUD' },
    imageUrl: `https://example.com/${overrides.id}.png`,
    category: { slug: categorySlug, name: CATEGORY_NAMES[categorySlug] ?? categorySlug },
    rating: { average: 3, count: 10 },
    ...overrides,
  };
}
