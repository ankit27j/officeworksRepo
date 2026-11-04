import type { Product } from '@catalogue/contracts';
import type { CacheStore } from '../../../../common/cache/cache-store.port';
import type { HttpClient } from '../../../../common/http/http-client';
import { SnapshotProductSource } from '../snapshot.product-source';
import { mapFakeStoreProducts } from './fakestore.mapper';

export interface FakeStoreOptions {
  baseUrl: string;
  ttlSeconds: number;
}

const REQUEST = { timeoutMs: 5000, retries: 1 } as const;

/**
 * Loads the whole Fake Store catalogue in one call. Single-product calls aren't used because
 * `GET /products/{unknown}` returns 200 with an empty body rather than a 404.
 */
export class FakeStoreProductSource extends SnapshotProductSource {
  override readonly name = 'fakestore';

  constructor(
    private readonly http: HttpClient,
    cache: CacheStore,
    private readonly options: FakeStoreOptions,
  ) {
    super(cache, options.ttlSeconds);
  }

  protected override async fetchAll(): Promise<Product[]> {
    const url = `${this.options.baseUrl.replace(/\/+$/, '')}/products`;
    return mapFakeStoreProducts(await this.http.getJson(url, REQUEST), this.logger);
  }
}
