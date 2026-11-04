import type { Category, Product } from '@catalogue/contracts';

/** Highest average first; more reviews wins a tie. */
export function byRatingDesc(a: Product, b: Product): number {
  return b.rating.average - a.rating.average || b.rating.count - a.rating.count;
}

export function byTitle(a: Product, b: Product): number {
  return a.title.localeCompare(b.title);
}

/**
 * In-memory search used by sources that hold the whole catalogue. A plain substring match, so every
 * result really does contain the term (acceptance criterion: "only see products that match").
 */
export function searchProducts(products: readonly Product[], term: string): Product[] {
  const needle = term.trim().toLocaleLowerCase();
  if (!needle) return [];

  const titleMatches: Product[] = [];
  const otherMatches: Product[] = [];
  for (const product of products) {
    if (product.title.toLocaleLowerCase().includes(needle)) {
      titleMatches.push(product);
    } else if (
      product.description.toLocaleLowerCase().includes(needle) ||
      product.category.name.toLocaleLowerCase().includes(needle)
    ) {
      otherMatches.push(product);
    }
  }
  return [...titleMatches, ...otherMatches];
}

export function uniqueCategories(products: readonly Product[]): Category[] {
  const bySlug = new Map<string, Category>();
  for (const { category } of products) {
    if (!bySlug.has(category.slug)) bySlug.set(category.slug, category);
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}
