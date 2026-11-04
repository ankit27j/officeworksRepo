import type { Product } from '@catalogue/contracts';
import { useEffect } from 'react';
import { snapshot } from '../stores/utils/AsyncResource';
import type { ResourceHook } from './types';
import { useStores } from './useStores';

export function useFeaturedProducts(): ResourceHook<Product[]> {
  const { catalog } = useStores();

  useEffect(() => {
    void catalog.loadFeatured();
  }, [catalog]);

  return { state: snapshot(catalog.featured), retry: () => void catalog.retryFeatured() };
}
