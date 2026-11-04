import type { Product } from '@catalogue/contracts';
import { action, makeObservable, observable } from 'mobx';
import type { ProductService } from '../api/services';
import { AsyncResource } from './utils/AsyncResource';

/** Results for the current search term. A newer search always replaces an older, slower one. */
export class SearchStore {
  term = '';
  readonly results = new AsyncResource<Product[]>();

  constructor(private readonly service: ProductService) {
    makeObservable(this, { term: observable, search: action, clear: action });
  }

  search(rawTerm: string): Promise<void> {
    const term = rawTerm.trim();
    if (!term) {
      this.clear();
      return Promise.resolve();
    }
    if (term === this.term && this.results.status !== 'error' && this.results.status !== 'idle') {
      return Promise.resolve();
    }
    this.term = term;
    return this.results.load(() => this.service.search(term));
  }

  clear(): void {
    this.term = '';
    this.results.reset();
  }
}
