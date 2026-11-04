import type { Category, Product } from '@catalogue/contracts';

export interface ProductListQuery {
  categorySlug?: string;
}

/**
 * Port for wherever product data lives (Fake Store today; a PIM, CMS or our own DB later).
 * Queries are part of the port so a real source can push filtering and search down to its own
 * engine instead of loading everything into memory.
 */
export abstract class ProductSource {
  /** Short id for logs and the health check, e.g. "fakestore". */
  abstract readonly name: string;

  abstract listCategories(): Promise<Category[]>;
  abstract listProducts(query?: ProductListQuery): Promise<Product[]>;
  abstract getProduct(id: string): Promise<Product | null>;
  /** Products in the order of `ids`. Unknown ids are left out. */
  abstract getProductsByIds(ids: readonly string[]): Promise<Product[]>;
  /** Case-insensitive match on title, description and category name. Title matches come first. */
  abstract searchProducts(term: string): Promise<Product[]>;
}
