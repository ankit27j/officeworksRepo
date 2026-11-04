import type { Category } from '@catalogue/contracts';
import { useEffect } from 'react';
import { snapshot } from '../stores/utils/AsyncResource';
import type { ResourceHook } from './types';
import { useStores } from './useStores';

export function useCategories(): ResourceHook<Category[]> {
  const { catalog } = useStores();

  useEffect(() => {
    void catalog.loadCategories();
  }, [catalog]);

  return { state: snapshot(catalog.categories), retry: () => void catalog.retryCategories() };
}
