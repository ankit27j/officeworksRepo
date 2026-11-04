import { MailOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useParams } from 'react-router';
import { EnquiryModal } from '../components/enquiry/EnquiryModal';
import { NotFoundResult } from '../components/feedback/NotFoundResult';
import { PageState } from '../components/feedback/PageState';
import { ProductDetails } from '../components/product/ProductDetails';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useEnquiry } from '../hooks/useEnquiry';
import { useProduct } from '../hooks/useProduct';

export const ProductPage = observer(function ProductPage() {
  const { id = '' } = useParams();
  const { state, retry } = useProduct(id);
  const enquiry = useEnquiry();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  useDocumentTitle(state.data?.title);

  const openEnquiry = () => {
    enquiry.reset(); // reset on open, not close, so the dialog doesn't flash the form while closing
    setEnquiryOpen(true);
  };

  return (
    <PageState
      state={state}
      onRetry={retry}
      notFound={<NotFoundResult title="Product not found" subTitle="That product isn't available." />}
    >
      {(product) => (
        <>
          <ProductDetails
            product={product}
            actions={
              <Button type="primary" size="large" icon={<MailOutlined aria-hidden />} onClick={openEnquiry}>
                Enquire
              </Button>
            }
          />
          <EnquiryModal
            open={enquiryOpen}
            product={product}
            state={enquiry.state}
            submitted={enquiry.submitted}
            onSubmit={(values) => enquiry.submit({ ...values, productId: product.id })}
            onClose={() => setEnquiryOpen(false)}
          />
        </>
      )}
    </PageState>
  );
});
