import { HttpClient } from '../httpClient';
import { CatalogService } from './catalogService';
import { EnquiryService } from './enquiryService';
import { ProductService } from './productService';

export interface Services {
  catalog: CatalogService;
  products: ProductService;
  enquiries: EnquiryService;
}

/** Builds the API layer. Stores receive these (constructor injection), so tests can pass fakes. */
export function createServices(http: HttpClient = new HttpClient()): Services {
  return {
    catalog: new CatalogService(http),
    products: new ProductService(http),
    enquiries: new EnquiryService(http),
  };
}

export { CatalogService, EnquiryService, ProductService };
