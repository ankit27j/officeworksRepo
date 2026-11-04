import { Global, Module } from '@nestjs/common';
import { CacheStore } from './cache-store.port';
import { MemoryCache } from './memory-cache';

@Global()
@Module({
  providers: [{ provide: CacheStore, useFactory: () => new MemoryCache() }],
  exports: [CacheStore],
})
export class CacheStoreModule {}
