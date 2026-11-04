import { NotFoundResult } from '../components/feedback/NotFoundResult';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return <NotFoundResult />;
}
