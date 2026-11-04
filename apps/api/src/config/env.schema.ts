import { z } from 'zod';

/** Every setting the API reads. Validated once at boot, so a bad config fails fast with a clear message. */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    /** Where featured picks and enquiries live. `memory` needs no database (lost on restart). */
    STORAGE: z.enum(['memory', 'postgres']).default('memory'),
    /** Required when STORAGE=postgres. */
    DATABASE_URL: optionalString(),
    PRODUCT_SOURCE: z.enum(['fakestore', 'fixture']).default('fakestore'),
    FAKESTORE_BASE_URL: z.url().default('https://fakestoreapi.com'),
    CATALOG_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
    /** Comma-separated list of allowed browser origins. */
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    /**
     * Proxies in front of the API (nginx, a load balancer). Express then takes the client IP from
     * X-Forwarded-For, so the enquiry rate limit is per customer, not per proxy. 0 = trust none.
     */
    TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),

    // --- Email (enquiries) ---
    MAILER: z.enum(['smtp', 'log']).default('smtp'),
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z.stringbool().default(false),
    /** Optional: Mailpit needs no auth; a real provider (e.g. SES SMTP) does. */
    SMTP_USER: optionalString(),
    SMTP_PASSWORD: optionalString(),
    MAIL_FROM: z.string().min(1).default('Catalogue <no-reply@catalogue.local>'),
    SALES_INBOX_EMAIL: z.email().default('sales@catalogue.local'),
    ENQUIRY_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(5),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE === 'postgres' && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Required when STORAGE=postgres' });
    }
  });

/** Treats an empty value (`SMTP_USER=` in .env) as not set. */
function optionalString() {
  return z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined);
}

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
