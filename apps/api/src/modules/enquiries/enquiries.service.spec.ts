import type { ConfigService } from '@nestjs/config';
import { CreateEnquirySchema } from '@catalogue/contracts';
import { FakeMailer } from '../../../test/fakes/fake-mailer';
import { InMemoryEnquiryRepository } from './adapters/in-memory-enquiry.repository';
import { aProduct } from '../../../test/fakes/product.factory';
import { MemoryCache } from '../../common/cache/memory-cache';
import { NotFoundError } from '../../common/errors/app-errors';
import type { Env } from '../../config/env.schema';
import { FixtureProductSource } from '../products/adapters/fixture/fixture.product-source';
import { EnquiriesService } from './enquiries.service';

const config = { get: () => 'sales@test.local' } as unknown as ConfigService<Env, true>;
const products = new FixtureProductSource(new MemoryCache(), [aProduct({ id: '3', title: 'Cotton Jacket' })]);

const input = (overrides: Record<string, unknown> = {}) =>
  CreateEnquirySchema.parse({
    productId: '3',
    name: 'Jane Citizen',
    email: 'jane@example.com',
    phone: '0400 000 000',
    message: 'Is this in stock?',
    ...overrides,
  });

describe('EnquiriesService', () => {
  let enquiries: InMemoryEnquiryRepository;
  let mailer: FakeMailer;
  let service: EnquiriesService;

  beforeEach(() => {
    enquiries = new InMemoryEnquiryRepository();
    mailer = new FakeMailer();
    service = new EnquiriesService(products, enquiries, mailer, config);
  });

  it('saves the enquiry, emails the sales inbox and marks it EMAILED', async () => {
    const result = await service.submit(input());

    expect(result).toEqual({ id: expect.any(String), status: 'received' });
    expect(enquiries.records).toEqual([
      expect.objectContaining({
        id: result.id,
        productId: '3',
        productTitle: 'Cotton Jacket',
        name: 'Jane Citizen',
        email: 'jane@example.com',
        phone: '0400 000 000',
        status: 'EMAILED',
      }),
    ]);
    expect(mailer.sent).toEqual([
      expect.objectContaining({
        to: 'sales@test.local',
        replyTo: 'jane@example.com',
        subject: 'New enquiry: Cotton Jacket',
      }),
    ]);
  });

  it('keeps the lead and still succeeds when the email fails', async () => {
    mailer.failWith = new Error('SMTP connection refused');

    const result = await service.submit(input());

    expect(result.status).toBe('received');
    expect(enquiries.records[0]).toEqual(
      expect.objectContaining({ status: 'EMAIL_FAILED', emailError: 'SMTP connection refused' }),
    );
  });

  it('still succeeds when updating the status fails after the email was sent', async () => {
    jest.spyOn(enquiries, 'markEmailed').mockRejectedValueOnce(new Error('DB blip'));

    await expect(service.submit(input())).resolves.toEqual(expect.objectContaining({ status: 'received' }));
    expect(mailer.sent).toHaveLength(1);
  });

  it('silently discards honeypot submissions', async () => {
    const result = await service.submit(input({ website: 'http://spam.example' }));

    expect(result.status).toBe('received');
    expect(enquiries.records).toEqual([]);
    expect(mailer.sent).toEqual([]);
  });

  it('rejects an unknown product without saving or emailing', async () => {
    await expect(service.submit(input({ productId: '999' }))).rejects.toBeInstanceOf(NotFoundError);
    expect(enquiries.records).toEqual([]);
    expect(mailer.sent).toEqual([]);
  });

  it('fails the request if the enquiry cannot be saved, without emailing', async () => {
    jest.spyOn(enquiries, 'create').mockRejectedValueOnce(new Error('DB down'));

    await expect(service.submit(input())).rejects.toThrow('DB down');
    expect(mailer.sent).toEqual([]);
  });
});
