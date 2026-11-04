import { type Product, ProductSchema, SearchResultsSchema } from '@catalogue/contracts';
import type { HttpClient } from '../httpClient';

export class ProductService {
  constructor(private readonly http: HttpClient) {}

  getById(id: string): Promise<Product> {
    return this.http.get(`/products/${encodeURIComponent(id)}`, ProductSchema);
  }

  search(term: string): Promise<Product[]> {
    return this.http.get('/products', SearchResultsSchema, { search: term });
  }
}
