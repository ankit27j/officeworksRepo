import { type CreateEnquiryInput, type EnquiryCreated, EnquiryCreatedSchema } from '@catalogue/contracts';
import type { HttpClient } from '../httpClient';

export class EnquiryService {
  constructor(private readonly http: HttpClient) {}

  submit(enquiry: CreateEnquiryInput): Promise<EnquiryCreated> {
    return this.http.post('/enquiries', enquiry, EnquiryCreatedSchema);
  }
}
