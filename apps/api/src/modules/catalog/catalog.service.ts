import { Injectable, Logger } from '@nestjs/common';
import { type Category, type CategoryPage, FEATURED_HOME_COUNT, type Product } from '@catalogue/contracts';
import { NotFoundError } from '../../common/errors/app-errors';
import { isDefined, withTimeout } from '../../common/utils/text';
import { byRatingDesc, byTitle } from '../products/domain/product-query';
import { ProductSource } from '../products/ports/product-source.port';
import { FeaturedRepository } from './ports/featured.repository.port';

/** How many best-rated products a category shows when nothing has been chosen for it. */
export const CATEGORY_TOP_RATED_FALLBACK_COUNT = 3;

/** A down DB can take seconds to fail; don't make every page wait that long for optional picks. */
export const PICKS_TIMEOUT_MS = 1500;

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly products: ProductSource,
    private readonly featured: FeaturedRepository,
  ) {}

  /**
   * The home page's chosen products, in the chosen order. Picks that no longer exist in the source
   * are skipped. If fewer than FEATURED_HOME_COUNT remain, best rated products fill the gap so the
   * home page is never empty.
   */
  async getFeatured(): Promise<Product[]> {
    const pickIds = await this.loadPicks('home', () => this.featured.findHomeProductIds());
    const found = await this.products.getProductsByIds(pickIds);
    this.warnIfMissing('home', pickIds, found);
    const picked = found.slice(0, FEATURED_HOME_COUNT);

    if (picked.length >= FEATURED_HOME_COUNT) return picked;

    const pickedIds = new Set(picked.map((p) => p.id));
    const fill = (await this.products.listProducts()).filter((p) => !pickedIds.has(p.id)).sort(byRatingDesc);
    return [...picked, ...fill].slice(0, FEATURED_HOME_COUNT);
  }

  listCategories(): Promise<Category[]> {
    return this.products.listCategories();
  }

  /**
   * topRated: products chosen for this category, or the best rated when none are chosen.
   * others:   the rest of the category, alphabetical, never repeating a topRated product.
   */
  async getCategoryPage(slug: string): Promise<CategoryPage> {
    const category = (await this.products.listCategories()).find((c) => c.slug === slug);
    if (!category) throw new NotFoundError('Category not found');

    const [products, pickIds] = await Promise.all([
      this.products.listProducts({ categorySlug: slug }),
      this.loadPicks(`category "${slug}"`, () => this.featured.findCategoryProductIds(slug)),
    ]);

    const byId = new Map(products.map((p) => [p.id, p]));
    const curated = pickIds.map((id) => byId.get(id)).filter(isDefined);
    this.warnIfMissing(`category "${slug}"`, pickIds, curated);

    const topRated =
      curated.length > 0
        ? curated
        : [...products].sort(byRatingDesc).slice(0, CATEGORY_TOP_RATED_FALLBACK_COUNT);
    const topIds = new Set(topRated.map((p) => p.id));
    const others = products.filter((p) => !topIds.has(p.id)).sort(byTitle);

    return { category, topRated, others };
  }

  /**
   * Picks are nice-to-have; product data is essential. If the picks store (DB) is down, log it and
   * carry on with no picks, so pages fall back to best rated instead of failing.
   */
  private async loadPicks(placement: string, load: () => Promise<string[]>): Promise<string[]> {
    try {
      return await withTimeout(load(), PICKS_TIMEOUT_MS, `Featured ${placement} picks`);
    } catch (error) {
      this.logger.error(
        `Could not load featured ${placement} picks; falling back to best rated`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  private warnIfMissing(placement: string, pickIds: readonly string[], found: readonly Product[]): void {
    const foundIds = new Set(found.map((p) => p.id));
    const missing = pickIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      this.logger.warn(`Featured ${placement} picks not available, skipped: ${missing.join(', ')}`);
    }
  }
}
