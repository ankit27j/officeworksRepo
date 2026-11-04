import {
  type Category,
  CategoryListSchema,
  type CategoryPage,
  CategoryPageSchema,
  FeaturedProductsSchema,
  type Product,
} from '@catalogue/contracts';
import type { HttpClient } from '../httpClient';

export class CatalogService {
  constructor(private readonly http: HttpClient) {}

  getFeatured(): Promise<Product[]> {
    return this.http.get('/catalog/featured', FeaturedProductsSchema);
  }

  listCategories(): Promise<Category[]> {
    return this.http.get('/categories', CategoryListSchema);
  }

  getCategoryPage(slug: string): Promise<CategoryPage> {
    return this.http.get(`/categories/${encodeURIComponent(slug)}`, CategoryPageSchema);
  }
}
