import type { CategoryPage } from '@catalogue/contracts';
import { useEffect } from 'react';
import { snapshot } from '../stores/utils/AsyncResource';
import type { ResourceHook } from './types';
import { useStores } from './useStores';

export function useCategoryPage(slug: string): ResourceHook<CategoryPage> {
  const { catalog } = useStores();

  useEffect(() => {
    void catalog.loadCategoryPage(slug);
  }, [catalog, slug]);

  return { state: snapshot(catalog.categoryPage(slug)), retry: () => void catalog.retryCategoryPage(slug) };
}
