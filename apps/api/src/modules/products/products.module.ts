import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheStore } from '../../common/cache/cache-store.port';
import { HttpClient } from '../../common/http/http-client';
import { ProductSource } from './ports/product-source.port';
import { createProductSource } from './product-source.factory';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [
    HttpClient,
    ProductsService,
    {
      provide: ProductSource,
      inject: [ConfigService, HttpClient, CacheStore],
      useFactory: createProductSource,
    },
  ],
  exports: [ProductSource],
})
export class ProductsModule {}
