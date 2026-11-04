import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const minimal = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

  it('applies safe local defaults', () => {
    const env = validateEnv(minimal);
    expect(env).toEqual(
      expect.objectContaining({
        API_PORT: 3000,
        STORAGE: 'memory',
        PRODUCT_SOURCE: 'fakestore',
        MAILER: 'smtp',
        SMTP_PORT: 1025,
        SMTP_SECURE: false,
        CORS_ORIGIN: ['http://localhost:5173'],
        ENQUIRY_RATE_LIMIT_PER_MIN: 5,
        TRUST_PROXY_HOPS: 0,
      }),
    );
    expect(env.SMTP_USER).toBeUndefined();
  });

  it('parses strings from the environment', () => {
    const env = validateEnv({
      ...minimal,
      API_PORT: '8080',
      SMTP_SECURE: 'true',
      SMTP_USER: '  ',
      CORS_ORIGIN: 'http://a.test, http://b.test',
    });
    expect(env.API_PORT).toBe(8080);
    expect(env.SMTP_SECURE).toBe(true);
    expect(env.SMTP_USER).toBeUndefined();
    expect(env.CORS_ORIGIN).toEqual(['http://a.test', 'http://b.test']);
  });

  it('needs no database by default (STORAGE=memory)', () => {
    const env = validateEnv({});
    expect(env.STORAGE).toBe('memory');
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('fails fast with a readable message on bad config', () => {
    expect(() => validateEnv({ PRODUCT_SOURCE: 'shopify', SALES_INBOX_EMAIL: 'nope' })).toThrow(
      /Invalid environment configuration[\s\S]*PRODUCT_SOURCE[\s\S]*SALES_INBOX_EMAIL/,
    );
  });

  it('requires DATABASE_URL when STORAGE=postgres', () => {
    expect(() => validateEnv({ STORAGE: 'postgres' })).toThrow(
      /Required when STORAGE=postgres[\s\S]*DATABASE_URL/,
    );
  });
});
