import { InMemoryEnquiryRepository } from './in-memory-enquiry.repository';

describe('InMemoryEnquiryRepository', () => {
  const enquiry = {
    productId: '3',
    productTitle: 'Jacket',
    name: 'Jane',
    email: 'jane@example.com',
    message: 'Hi',
  };

  it('tracks the email status of each enquiry', async () => {
    const repo = new InMemoryEnquiryRepository();
    const a = await repo.create(enquiry);
    const b = await repo.create(enquiry);

    await repo.markEmailed(a.id);
    await repo.markEmailFailed(b.id, 'SMTP down');

    expect(repo.records).toEqual([
      expect.objectContaining({ id: a.id, status: 'EMAILED' }),
      expect.objectContaining({ id: b.id, status: 'EMAIL_FAILED', emailError: 'SMTP down' }),
    ]);
  });

  it('drops the oldest enquiries once full, so memory stays bounded', async () => {
    const repo = new InMemoryEnquiryRepository(2);
    const first = await repo.create(enquiry);
    await repo.create(enquiry);
    await repo.create(enquiry);

    expect(repo.records).toHaveLength(2);
    expect(repo.records.map((r) => r.id)).not.toContain(first.id);
    // A late status update for a dropped enquiry is ignored rather than failing the request.
    await expect(repo.markEmailed(first.id)).resolves.toBeUndefined();
  });
});
