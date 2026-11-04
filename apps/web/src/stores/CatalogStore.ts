import type { Category, CategoryPage, Product } from '@catalogue/contracts';
import { action, makeObservable, observable } from 'mobx';
import type { CatalogService } from '../api/services';
import { AsyncResource, type AsyncState, IDLE_STATE } from './utils/AsyncResource';

/** Featured products, the category list and category pages. Each is fetched once per session. */
export class CatalogStore {
  readonly featured = new AsyncResource<Product[]>();
  readonly categories = new AsyncResource<Category[]>();
  private readonly categoryPages = observable.map<string, AsyncResource<CategoryPage>>();

  constructor(private readonly service: CatalogService) {
    makeObservable(this, { loadCategoryPage: action, retryCategoryPage: action });
  }

  loadFeatured(): Promise<void> {
    return this.featured.ensureLoaded(() => this.service.getFeatured());
  }

  retryFeatured(): Promise<void> {
    return this.featured.load(() => this.service.getFeatured());
  }

  loadCategories(): Promise<void> {
    return this.categories.ensureLoaded(() => this.service.listCategories());
  }

  retryCategories(): Promise<void> {
    return this.categories.load(() => this.service.listCategories());
  }

  /** Pure read for render: never creates state. */
  categoryPage(slug: string): AsyncState<CategoryPage> {
    return this.categoryPages.get(slug) ?? IDLE_STATE;
  }

  loadCategoryPage(slug: string): Promise<void> {
    return this.resourceFor(slug).ensureLoaded(() => this.service.getCategoryPage(slug));
  }

  retryCategoryPage(slug: string): Promise<void> {
    return this.resourceFor(slug).load(() => this.service.getCategoryPage(slug));
  }

  private resourceFor(slug: string): AsyncResource<CategoryPage> {
    let resource = this.categoryPages.get(slug);
    if (!resource) {
      resource = new AsyncResource<CategoryPage>();
      this.categoryPages.set(slug, resource);
    }
    return resource;
  }
}
