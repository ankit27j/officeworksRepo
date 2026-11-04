import { observer } from 'mobx-react-lite';
import { PageState } from '../components/feedback/PageState';
import { ProductSection } from '../components/product/ProductSection';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFeaturedProducts } from '../hooks/useFeaturedProducts';

export const HomePage = observer(function HomePage() {
  useDocumentTitle(undefined);
  const { state, retry } = useFeaturedProducts();

  return (
    <PageState
      state={state}
      onRetry={retry}
      isEmpty={(products) => products.length === 0}
      emptyText="No featured products yet."
    >
      {(products) => (
        <ProductSection
          headingLevel={1}
          title="Top rated products"
          description="Our pick of the best right now."
          products={products}
        />
      )}
    </PageState>
  );
});
