import { Logger } from '@nestjs/common';
import type { Category, Product } from '@catalogue/contracts';
import type { CacheStore } from '../../../common/cache/cache-store.port';
import { isDefined } from '../../../common/utils/text';
import { searchProducts, uniqueCategories } from '../domain/product-query';
import { type ProductListQuery, ProductSource } from '../ports/product-source.port';

/** While upstream is down, serve the last good copy and only re-try every so often. */
const STALE_RETRY_SECONDS = 30;

/**
 * Base for small catalogues that can be loaded whole (Fake Store has ~20 products). Subclasses only
 * implement `fetchAll()`. This class answers every query from a cached copy of the full list:
 *  - one upstream call per TTL, shared by everyone requesting at the same time
 *  - if a refresh fails, the last good copy is served instead of an error
 * A large catalogue would implement ProductSource directly and query its own store instead.
 */
export abstract class SnapshotProductSource extends ProductSource {
  protected readonly logger = new Logger(this.constructor.name);
  private lastGood: Product[] | null = null;
  private inFlight: Promise<Product[]> | null = null;

  protected constructor(
    private readonly cache: CacheStore,
    private readonly ttlSeconds: number,
  ) {
    super();
  }

  protected abstract fetchAll(): Promise<Product[]>;

  override async listCategories(): Promise<Category[]> {
    return uniqueCategories(await this.snapshot());
  }

  override async listProducts(query: ProductListQuery = {}): Promise<Product[]> {
    const products = await this.snapshot();
    const { categorySlug } = query;
    return categorySlug ? products.filter((p) => p.category.slug === categorySlug) : [...products];
  }

  override async getProduct(id: string): Promise<Product | null> {
    return (await this.snapshot()).find((p) => p.id === id) ?? null;
  }

  override async getProductsByIds(ids: readonly string[]): Promise<Product[]> {
    const byId = new Map((await this.snapshot()).map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(isDefined);
  }

  override async searchProducts(term: string): Promise<Product[]> {
    return searchProducts(await this.snapshot(), term);
  }

  private get cacheKey(): string {
    return `products:snapshot:${this.name}`;
  }

  private async snapshot(): Promise<Product[]> {
    const cached = await this.cache.get<Product[]>(this.cacheKey);
    if (cached) return cached;

    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<Product[]> {
    try {
      const products = await this.fetchAll();
      this.lastGood = products;
      await this.cache.set(this.cacheKey, products, this.ttlSeconds);
      return products;
    } catch (error) {
      if (!this.lastGood) throw error;
      this.logger.warn(`Refresh failed; serving last good catalogue (${(error as Error).message})`);
      await this.cache.set(this.cacheKey, this.lastGood, Math.min(this.ttlSeconds, STALE_RETRY_SECONDS));
      return this.lastGood;
    }
  }
}
