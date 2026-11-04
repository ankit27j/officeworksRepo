import type { CreateEnquiryInput, EnquiryCreated } from '@catalogue/contracts';
import { action, makeObservable, observable } from 'mobx';
import type { EnquiryService } from '../api/services';
import { AsyncResource } from './utils/AsyncResource';

/** The enquiry being sent from the product page, and what was sent (for the "Thank you" message). */
export class EnquiryStore {
  readonly submission = new AsyncResource<EnquiryCreated>();
  lastSubmitted: CreateEnquiryInput | undefined = undefined;

  constructor(private readonly service: EnquiryService) {
    makeObservable(this, { lastSubmitted: observable.ref, submit: action, reset: action });
  }

  submit(enquiry: CreateEnquiryInput): Promise<void> {
    this.lastSubmitted = enquiry;
    return this.submission.load(() => this.service.submit(enquiry));
  }

  /** Called when the form is opened again, so it starts fresh. */
  reset(): void {
    this.lastSubmitted = undefined;
    this.submission.reset();
  }
}
