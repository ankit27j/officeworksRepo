// Tests never read .env and never touch the network: fixture products, no real email.
process.env.NODE_ENV = 'test';
process.env.PRODUCT_SOURCE = 'fixture';
process.env.MAILER = 'log';
process.env.SALES_INBOX_EMAIL = 'sales@test.local';
process.env.ENQUIRY_RATE_LIMIT_PER_MIN = '3';
// As behind nginx in Docker, so the rate-limit suite can check clients are told apart by X-Forwarded-For.
process.env.TRUST_PROXY_HOPS = '1';
// Integration suites run in postgres mode with the repositories swapped for in-memory ones, so the
// health check's DB up/down logic is exercised. memory-storage.int-spec.ts covers STORAGE=memory.
process.env.STORAGE ??= 'postgres';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
