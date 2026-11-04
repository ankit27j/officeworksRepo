export interface NewEnquiry {
  productId: string;
  /** Title at the time of the enquiry; the product source may change or drop the product later. */
  productTitle: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface EnquiryRecord extends NewEnquiry {
  id: string;
  createdAt: Date;
}

/** Port for storing enquiries (sales leads) and their email delivery status. */
export abstract class EnquiryRepository {
  abstract create(enquiry: NewEnquiry): Promise<EnquiryRecord>;
  abstract markEmailed(id: string): Promise<void>;
  abstract markEmailFailed(id: string, reason: string): Promise<void>;
}
