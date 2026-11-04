import { Empty, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { useSearchParams } from 'react-router';
import { PageState } from '../components/feedback/PageState';
import { ProductGrid } from '../components/product/ProductGrid';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSearch } from '../hooks/useSearch';
import { pluralize } from '../utils/format';

export const SearchPage = observer(function SearchPage() {
  const [params] = useSearchParams();
  const term = (params.get('q') ?? '').trim();
  const { state, retry } = useSearch(term);
  useDocumentTitle(term ? `Search: ${term}` : 'Search');

  if (!term) return <Empty description="Enter a search term above to find products." />;

  return (
    <>
      <Typography.Title level={1}>Results for “{term}”</Typography.Title>
      <PageState
        state={state}
        onRetry={retry}
        isEmpty={(products) => products.length === 0}
        emptyText={`No products match “${term}”. Try a different word.`}
      >
        {(products) => (
          <>
            <Typography.Paragraph type="secondary">
              {pluralize(products.length, 'product')} found
            </Typography.Paragraph>
            <ProductGrid products={products} />
          </>
        )}
      </PageState>
    </>
  );
});
