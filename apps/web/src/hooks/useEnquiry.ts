import type { CreateEnquiryInput, EnquiryCreated } from '@catalogue/contracts';
import { type AsyncState, snapshot } from '../stores/utils/AsyncResource';
import { useStores } from './useStores';

export interface EnquiryHook {
  state: AsyncState<EnquiryCreated>;
  /** What was sent last, for the "Thank you" message. */
  submitted: CreateEnquiryInput | undefined;
  submit: (enquiry: CreateEnquiryInput) => void;
  reset: () => void;
}

/** Call from an observer component. Returns plain values (see snapshot()). */
export function useEnquiry(): EnquiryHook {
  const { enquiry } = useStores();
  return {
    state: snapshot(enquiry.submission),
    submitted: enquiry.lastSubmitted,
    submit: (input) => void enquiry.submit(input),
    reset: () => enquiry.reset(),
  };
}
