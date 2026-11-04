import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  type Product,
  ProductIdSchema,
  type SearchQuery,
  SearchQuerySchema,
  type SearchResults,
} from '@catalogue/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** GET /api/v1/products?search=term */
  @Get()
  search(@Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQuery): Promise<SearchResults> {
    return this.products.search(query.search);
  }

  /** GET /api/v1/products/:id */
  @Get(':id')
  getById(@Param('id', new ZodValidationPipe(ProductIdSchema)) id: string): Promise<Product> {
    return this.products.getById(id);
  }
}
