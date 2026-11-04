import type { ConfigService } from '@nestjs/config';
import type { CacheStore } from '../../common/cache/cache-store.port';
import type { HttpClient } from '../../common/http/http-client';
import type { Env } from '../../config/env.schema';
import { FakeStoreProductSource } from './adapters/fakestore/fakestore.product-source';
import { FixtureProductSource } from './adapters/fixture/fixture.product-source';
import type { ProductSource } from './ports/product-source.port';

/** The one place that picks a product source. A new source means a new case here plus an adapter. */
export function createProductSource(
  config: ConfigService<Env, true>,
  http: HttpClient,
  cache: CacheStore,
): ProductSource {
  const source = config.get('PRODUCT_SOURCE', { infer: true });
  switch (source) {
    case 'fakestore':
      return new FakeStoreProductSource(http, cache, {
        baseUrl: config.get('FAKESTORE_BASE_URL', { infer: true }),
        ttlSeconds: config.get('CATALOG_CACHE_TTL_SECONDS', { infer: true }),
      });
    case 'fixture':
      return new FixtureProductSource(cache);
    default: {
      const unsupported: never = source;
      throw new Error(`Unsupported PRODUCT_SOURCE: ${String(unsupported)}`);
    }
  }
}
