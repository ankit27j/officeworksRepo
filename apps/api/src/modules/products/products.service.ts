import { Injectable } from '@nestjs/common';
import type { Product } from '@catalogue/contracts';
import { NotFoundError } from '../../common/errors/app-errors';
import { ProductSource } from './ports/product-source.port';

@Injectable()
export class ProductsService {
  constructor(private readonly source: ProductSource) {}

  async getById(id: string): Promise<Product> {
    const product = await this.source.getProduct(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  search(term: string): Promise<Product[]> {
    return this.source.searchProducts(term);
  }
}
