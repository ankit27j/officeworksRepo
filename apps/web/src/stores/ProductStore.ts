import type { Product } from '@catalogue/contracts';
import { action, makeObservable, observable } from 'mobx';
import type { ProductService } from '../api/services';
import { AsyncResource, type AsyncState, IDLE_STATE } from './utils/AsyncResource';

/** Product details, kept per id so going back to a product doesn't fetch it again. */
export class ProductStore {
  private readonly byId = observable.map<string, AsyncResource<Product>>();

  constructor(private readonly service: ProductService) {
    makeObservable(this, { load: action, retry: action });
  }

  product(id: string): AsyncState<Product> {
    return this.byId.get(id) ?? IDLE_STATE;
  }

  load(id: string): Promise<void> {
    return this.resourceFor(id).ensureLoaded(() => this.service.getById(id));
  }

  retry(id: string): Promise<void> {
    return this.resourceFor(id).load(() => this.service.getById(id));
  }

  private resourceFor(id: string): AsyncResource<Product> {
    let resource = this.byId.get(id);
    if (!resource) {
      resource = new AsyncResource<Product>();
      this.byId.set(id, resource);
    }
    return resource;
  }
}
