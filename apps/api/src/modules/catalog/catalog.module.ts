import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsModule } from '../products/products.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { createFeaturedRepository } from './featured-repository.factory';
import { FeaturedRepository } from './ports/featured.repository.port';

@Module({
  imports: [ProductsModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    {
      provide: FeaturedRepository,
      inject: [ConfigService, PrismaService],
      useFactory: createFeaturedRepository,
    },
  ],
})
export class CatalogModule {}
