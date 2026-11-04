import { ApiErrorBodySchema, EnquiryCreatedSchema } from '@catalogue/contracts';
import request from 'supertest';
import { createTestApp, type TestApp } from './utils/create-test-app';

const valid = {
  productId: '3',
  name: 'Jane Citizen',
  email: 'jane@example.com',
  phone: '',
  message: 'Is this available in blue?',
};

describe('POST /api/v1/enquiries (integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  beforeEach(() => {
    testApp.enquiries.reset();
    testApp.mailer.reset();
  });

  const post = (body: object) => request(testApp.app.getHttpServer()).post('/api/v1/enquiries').send(body);

  it('201: saves the enquiry and emails the sales inbox', async () => {
    const res = await post(valid).expect(201);

    const created = EnquiryCreatedSchema.parse(res.body);
    expect(testApp.enquiries.records).toEqual([
      expect.objectContaining({ id: created.id, productTitle: 'Mens Cotton Jacket', status: 'EMAILED' }),
    ]);
    // Empty phone from the form is stored as "not provided".
    expect(testApp.enquiries.records[0]?.phone).toBeUndefined();

    const [email] = testApp.mailer.sent;
    expect(email).toEqual(
      expect.objectContaining({
        to: 'sales@test.local',
        replyTo: 'jane@example.com',
        subject: 'New enquiry: Mens Cotton Jacket',
      }),
    );
    expect(email?.text).toContain('Is this available in blue?');
  });

  it('201 even when the email provider is down; the lead is kept as EMAIL_FAILED', async () => {
    testApp.mailer.failWith = new Error('connect ECONNREFUSED 127.0.0.1:1025');

    await post(valid).expect(201);
    expect(testApp.enquiries.records[0]?.status).toBe('EMAIL_FAILED');
  });

  it('400 with field details for invalid input, and nothing is saved', async () => {
    const res = await post({ productId: '3', name: ' ', email: 'not-an-email', message: '' }).expect(400);

    const body = ApiErrorBodySchema.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.map((d) => d.path)).toEqual(
      expect.arrayContaining(['name', 'email', 'message']),
    );
    expect(testApp.enquiries.records).toEqual([]);
    expect(testApp.mailer.sent).toEqual([]);
  });

  it('400 for malformed JSON', async () => {
    const res = await request(testApp.app.getHttpServer())
      .post('/api/v1/enquiries')
      .set('content-type', 'application/json')
      .send('{"name": ')
      .expect(400);
    expect(ApiErrorBodySchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('404 for an unknown product', async () => {
    const res = await post({ ...valid, productId: '999' }).expect(404);
    expect(ApiErrorBodySchema.parse(res.body).error.code).toBe('NOT_FOUND');
    expect(testApp.enquiries.records).toEqual([]);
  });

  it('honeypot: looks like success to a bot, but nothing is saved or sent', async () => {
    const res = await post({ ...valid, website: 'http://spam.example' }).expect(201);

    expect(EnquiryCreatedSchema.parse(res.body).status).toBe('received');
    expect(testApp.enquiries.records).toEqual([]);
    expect(testApp.mailer.sent).toEqual([]);
  });
});
