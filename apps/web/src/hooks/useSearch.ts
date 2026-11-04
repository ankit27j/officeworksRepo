import type { Product } from '@catalogue/contracts';
import { useEffect } from 'react';
import { LOADING_STATE, snapshot } from '../stores/utils/AsyncResource';
import type { ResourceHook } from './types';
import { useStores } from './useStores';

/** Runs a search whenever `term` changes. The term comes from the URL, so results survive refresh and back. */
export function useSearch(term: string): ResourceHook<Product[]> {
  const { search } = useStores();

  useEffect(() => {
    void search.search(term);
  }, [search, term]);

  // Until the effect starts the new search, the store still holds the previous term's results.
  // Never show those under the new term's heading.
  const state = search.term === term ? snapshot(search.results) : LOADING_STATE;

  // search() re-runs a term whose last attempt failed, so retrying is just searching again.
  return { state, retry: () => void search.search(term) };
}
