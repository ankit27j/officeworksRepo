import { ApiErrorBodySchema } from '@catalogue/contracts';
import request from 'supertest';
import { createTestApp, type TestApp } from './utils/create-test-app';

/** Uses the real ThrottlerGuard. The limit comes from ENQUIRY_RATE_LIMIT_PER_MIN=3 in test/setup-env.ts. */
describe('Enquiry rate limiting (integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp({ rateLimit: true });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('allows 3 enquiries per minute per client, then returns 429 RATE_LIMITED', async () => {
    const body = { productId: '3', name: 'Jane', email: 'jane@example.com', message: 'Hi' };
    const post = () => request(testApp.app.getHttpServer()).post('/api/v1/enquiries').send(body);

    for (let i = 0; i < 3; i++) await post().expect(201);

    const res = await post().expect(429);
    const error = ApiErrorBodySchema.parse(res.body).error;
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.message).toBe('Too many enquiries. Please wait a minute and try again.');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('limits each client behind the proxy separately (X-Forwarded-For)', async () => {
    const body = { productId: '3', name: 'Jane', email: 'jane@example.com', message: 'Hi' };
    const post = (ip: string) =>
      request(testApp.app.getHttpServer()).post('/api/v1/enquiries').set('X-Forwarded-For', ip).send(body);

    for (let i = 0; i < 3; i++) await post('203.0.113.10').expect(201);
    await post('203.0.113.10').expect(429);
    await post('203.0.113.20').expect(201);
  });

  it('does not rate limit browsing', async () => {
    for (let i = 0; i < 5; i++) {
      await request(testApp.app.getHttpServer()).get('/api/v1/categories').expect(200);
    }
  });
});
