import type { CreateEnquiryInput, EnquiryCreated, Product } from '@catalogue/contracts';
import { Modal } from 'antd';
import type { AsyncState } from '../../stores/utils/AsyncResource';
import { EnquiryForm, type EnquiryFormValues } from './EnquiryForm';
import { EnquiryThankYou } from './EnquiryThankYou';

interface EnquiryModalProps {
  open: boolean;
  product: Product;
  state: AsyncState<EnquiryCreated>;
  submitted: CreateEnquiryInput | undefined;
  onSubmit: (values: EnquiryFormValues) => void;
  onClose: () => void;
}

/** The enquiry form in a dialog; swaps to the "Thank you" message once the API accepts it. */
export function EnquiryModal({ open, product, state, submitted, onSubmit, onClose }: EnquiryModalProps) {
  const sent = state.status === 'success' && submitted;
  const fieldErrors = state.error?.details ?? [];
  const errorMessage =
    state.error && (fieldErrors.length > 0 ? 'Please fix the highlighted fields.' : state.error.message);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={sent ? undefined : `Enquire about ${product.title}`}
      footer={null}
      destroyOnHidden
    >
      {sent ? (
        <EnquiryThankYou
          name={submitted.name}
          email={submitted.email}
          productTitle={product.title}
          onClose={onClose}
        />
      ) : (
        <EnquiryForm
          productTitle={product.title}
          submitting={state.status === 'loading'}
          onSubmit={onSubmit}
          errorMessage={errorMessage || undefined}
          fieldErrors={fieldErrors}
        />
      )}
    </Modal>
  );
}
