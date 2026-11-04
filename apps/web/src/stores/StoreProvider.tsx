import { createContext, type ReactNode } from 'react';
import type { RootStore } from './RootStore';

export const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({ store, children }: { store: RootStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
