import type { Services } from '../api/services';
import { CatalogStore } from './CatalogStore';
import { EnquiryStore } from './EnquiryStore';
import { ProductStore } from './ProductStore';
import { SearchStore } from './SearchStore';
import { type ThemeEnvironment, ThemeStore } from './ThemeStore';

/** Builds every store and hands each one the services it needs. One instance per app (or per test). */
export class RootStore {
  readonly catalog: CatalogStore;
  readonly products: ProductStore;
  readonly search: SearchStore;
  readonly enquiry: EnquiryStore;
  readonly theme: ThemeStore;

  constructor(services: Services, themeEnv: ThemeEnvironment) {
    this.catalog = new CatalogStore(services.catalog);
    this.products = new ProductStore(services.products);
    this.search = new SearchStore(services.products);
    this.enquiry = new EnquiryStore(services.enquiries);
    this.theme = new ThemeStore(themeEnv);
  }
}
