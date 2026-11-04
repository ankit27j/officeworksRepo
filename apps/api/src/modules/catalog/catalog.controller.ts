import { Controller, Get, Param } from '@nestjs/common';
import {
  type CategoryList,
  type CategoryPage,
  CategorySlugSchema,
  type FeaturedProducts,
} from '@catalogue/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** GET /api/v1/catalog/featured */
  @Get('catalog/featured')
  getFeatured(): Promise<FeaturedProducts> {
    return this.catalog.getFeatured();
  }

  /** GET /api/v1/categories */
  @Get('categories')
  listCategories(): Promise<CategoryList> {
    return this.catalog.listCategories();
  }

  /** GET /api/v1/categories/:slug */
  @Get('categories/:slug')
  getCategoryPage(
    @Param('slug', new ZodValidationPipe(CategorySlugSchema)) slug: string,
  ): Promise<CategoryPage> {
    return this.catalog.getCategoryPage(slug);
  }
}
