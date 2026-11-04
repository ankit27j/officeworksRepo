import { useEffect } from 'react';
import { APP_CONFIG } from '../config/app';

/** "Electronics · Catalogue". Pass undefined while the page is still loading. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_CONFIG.name}` : APP_CONFIG.name;
  }, [title]);
}
