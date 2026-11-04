import type { Product } from '@catalogue/contracts';
import { useEffect } from 'react';
import { snapshot } from '../stores/utils/AsyncResource';
import type { ResourceHook } from './types';
import { useStores } from './useStores';

export function useProduct(id: string): ResourceHook<Product> {
  const { products } = useStores();

  useEffect(() => {
    void products.load(id);
  }, [products, id]);

  return { state: snapshot(products.product(id)), retry: () => void products.retry(id) };
}
