import { type Product, ProductSchema } from '@catalogue/contracts';
import type { CacheStore } from '../../../../common/cache/cache-store.port';
import { SnapshotProductSource } from '../snapshot.product-source';
import { FIXTURE_PRODUCTS } from './products.fixture';

/** Static data never changes, so it never needs refreshing. */
const NEVER_EXPIRES = Number.POSITIVE_INFINITY;

/** Offline product source. Also shows that the rest of the app doesn't care which source is used. */
export class FixtureProductSource extends SnapshotProductSource {
  override readonly name = 'fixture';

  constructor(
    cache: CacheStore,
    private readonly products: readonly Product[] = FIXTURE_PRODUCTS,
  ) {
    super(cache, NEVER_EXPIRES);
  }

  protected override async fetchAll(): Promise<Product[]> {
    return this.products.map((product) => ProductSchema.parse(product));
  }
}
