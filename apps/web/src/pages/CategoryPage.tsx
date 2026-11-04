import { Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { useParams } from 'react-router';
import { NotFoundResult } from '../components/feedback/NotFoundResult';
import { PageState } from '../components/feedback/PageState';
import { ProductSection } from '../components/product/ProductSection';
import { useCategoryPage } from '../hooks/useCategoryPage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const CategoryPage = observer(function CategoryPage() {
  const { slug = '' } = useParams();
  const { state, retry } = useCategoryPage(slug);
  useDocumentTitle(state.data?.category.name);

  return (
    <PageState
      state={state}
      onRetry={retry}
      notFound={<NotFoundResult title="Category not found" subTitle="That category doesn't exist." />}
    >
      {({ category, topRated, others }) => (
        <>
          <Typography.Title level={1}>{category.name}</Typography.Title>
          <ProductSection title="Top rated" products={topRated} emptyText="Nothing here yet." />
          <ProductSection
            title={`More in ${category.name}`}
            products={others}
            emptyText="That's everything in this category."
          />
        </>
      )}
    </PageState>
  );
});
