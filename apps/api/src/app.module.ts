import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheStoreModule } from './common/cache/cache.module';
import { validateEnv } from './config/env.schema';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { HealthModule } from './modules/health/health.module';
import { ProductsModule } from './modules/products/products.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Run from apps/api (npm workspaces) or the repo root; real env vars always win.
      envFilePath: ['.env', '../../.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnv,
    }),
    CacheStoreModule,
    PrismaModule,
    ProductsModule,
    CatalogModule,
    EnquiriesModule,
    HealthModule,
  ],
})
export class AppModule {}
