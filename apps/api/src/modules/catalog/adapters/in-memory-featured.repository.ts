import { FeaturedRepository } from '../ports/featured.repository.port';

/** Picks held in memory (`STORAGE=memory`, and tests). Production picks come from `featured-picks.ts`. */
export class InMemoryFeaturedRepository extends FeaturedRepository {
  constructor(
    private readonly home: readonly string[] = [],
    private readonly categories: Readonly<Record<string, readonly string[]>> = {},
  ) {
    super();
  }

  override async findHomeProductIds(): Promise<string[]> {
    return [...this.home];
  }

  override async findCategoryProductIds(categorySlug: string): Promise<string[]> {
    return [...(this.categories[categorySlug] ?? [])];
  }
}
