import { useContext } from 'react';
import type { RootStore } from '../stores/RootStore';
import { StoreContext } from '../stores/StoreProvider';

export function useStores(): RootStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStores must be used inside <StoreProvider>');
  return store;
}
