import { randomUUID } from 'node:crypto';
import { type EnquiryRecord, EnquiryRepository, type NewEnquiry } from '../ports/enquiry.repository.port';

export type StoredEnquiry = EnquiryRecord & {
  status: 'RECEIVED' | 'EMAILED' | 'EMAIL_FAILED';
  emailError?: string;
};

/** Public endpoint, so memory is bounded: once full, the oldest enquiries are dropped (they were already emailed). */
const DEFAULT_MAX_RECORDS = 1000;

/**
 * Enquiries kept in process memory (`STORAGE=memory`, and tests). Lost on restart, and not shared
 * between API instances; use `STORAGE=postgres` wherever leads must be kept.
 */
export class InMemoryEnquiryRepository extends EnquiryRepository {
  readonly records: StoredEnquiry[] = [];

  constructor(private readonly maxRecords = DEFAULT_MAX_RECORDS) {
    super();
  }

  override async create(enquiry: NewEnquiry): Promise<EnquiryRecord> {
    const record: StoredEnquiry = { ...enquiry, id: randomUUID(), createdAt: new Date(), status: 'RECEIVED' };
    this.records.push(record);
    if (this.records.length > this.maxRecords) this.records.shift();
    return { ...enquiry, id: record.id, createdAt: record.createdAt };
  }

  override async markEmailed(id: string): Promise<void> {
    const record = this.find(id);
    if (record) record.status = 'EMAILED';
  }

  override async markEmailFailed(id: string, reason: string): Promise<void> {
    const record = this.find(id);
    if (record) Object.assign(record, { status: 'EMAIL_FAILED', emailError: reason });
  }

  reset(): void {
    this.records.length = 0;
  }

  private find(id: string): StoredEnquiry | undefined {
    return this.records.find((r) => r.id === id);
  }
}
