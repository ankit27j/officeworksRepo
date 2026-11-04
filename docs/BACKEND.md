# Backend guide (`apps/api`)

How the API is built, how a request flows through it, and how to change the parts the business expects to change. Read this before your first backend change. It's kept up to date with every phase.

> Stack: **NestJS 11** (Node.js + TypeScript), **PostgreSQL** via **Prisma 6**, **Zod 4** validation, **nodemailer** (SMTP) for email, **Jest** for tests.

---

## 1. What the API does

| Endpoint                           | Purpose                                                         | Acceptance criterion |
| ---------------------------------- | --------------------------------------------------------------- | -------------------- |
| `GET /api/v1/catalog/featured`     | The 5 products the business chose as "top rated"                | Home                 |
| `GET /api/v1/categories`           | Category list for navigation                                    | Category             |
| `GET /api/v1/categories/:slug`     | `{ category, topRated[], others[] }`                            | Category             |
| `GET /api/v1/products?search=term` | Products whose title, description or category contains the term | Search               |
| `GET /api/v1/products/:id`         | One product                                                     | Product              |
| `POST /api/v1/enquiries`           | Save an enquiry and email the sales inbox                       | Enquiry              |
| `GET /health`                      | Storage, DB status, product source (for Docker/load balancers)  | ops                  |

Every request and response shape is defined once in [`packages/contracts`](../packages/contracts/src) (Zod schemas + TypeScript types) and shared with the web app.

Every error has the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "email", "message": "Enter a valid email address" }]
  }
}
```

| Code                   | HTTP | When                                                           |
| ---------------------- | ---- | -------------------------------------------------------------- |
| `VALIDATION_ERROR`     | 400  | Bad query/params/body, malformed JSON                          |
| `NOT_FOUND`            | 404  | Unknown product, category or route                             |
| `RATE_LIMITED`         | 429  | More than 5 enquiries a minute from one IP                     |
| `UPSTREAM_UNAVAILABLE` | 502  | Product source down and nothing cached                         |
| `INTERNAL`             | 500  | Anything unexpected (details logged, never sent to the client) |

---

## 2. The big idea: ports and adapters

The brief says the **product data source**, **email provider** and **look and feel** will change. So the services never talk to Fake Store, storage or SMTP directly. They talk to **ports**, abstract classes that describe _what_ is needed. **Adapters** implement _how_, and config chooses which adapter runs.

```
            HTTP
              │
   ┌──────────▼───────────┐
   │ Controllers           │  parse + validate (Zod pipe), nothing else
   └──────────┬───────────┘
   ┌──────────▼───────────┐
   │ Services              │  business rules (featured, category split, enquiry flow)
   └──────────┬───────────┘
              │ depend only on ports ↓
   ┌──────────▼────────────────────────────────────────────────────────┐
   │ Ports:  ProductSource · FeaturedRepository · EnquiryRepository ·  │
   │         Mailer · CacheStore                                       │
   └──────────┬────────────────────────────────────────────────────────┘
   ┌──────────▼────────────────────────────────────────────────────────┐
   │ Adapters: FakeStoreProductSource · FixtureProductSource ·         │
   │           InMemory/Prisma FeaturedRepository ·                    │
   │           InMemory/Prisma EnquiryRepository ·                     │
   │           SmtpMailer · LogMailer · MemoryCache                    │
   └───────────────────────────────────────────────────────────────────┘
```

Ports are **abstract classes**, not interfaces, because a TypeScript interface disappears at runtime while a class can also serve as Nest's dependency-injection token. A service just asks for `ProductSource` in its constructor, and Nest supplies whichever adapter the module chose.

| Port                 | Adapters                                                 | Chosen by                                                                                                                     |
| -------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ProductSource`      | `FakeStoreProductSource`, `FixtureProductSource`         | `PRODUCT_SOURCE=fakestore\|fixture` ([product-source.factory.ts](../apps/api/src/modules/products/product-source.factory.ts)) |
| `Mailer`             | `SmtpMailer`, `LogMailer`                                | `MAILER=smtp\|log` ([mailer.factory.ts](../apps/api/src/modules/enquiries/mailer.factory.ts))                                 |
| `FeaturedRepository` | `InMemoryFeaturedRepository`, `PrismaFeaturedRepository` | `STORAGE=memory\|postgres` ([featured-repository.factory.ts](../apps/api/src/modules/catalog/featured-repository.factory.ts)) |
| `EnquiryRepository`  | `InMemoryEnquiryRepository`, `PrismaEnquiryRepository`   | `STORAGE=memory\|postgres` ([enquiry-repository.factory.ts](../apps/api/src/modules/enquiries/enquiry-repository.factory.ts)) |
| `CacheStore`         | `MemoryCache`                                            | module binding (Redis later)                                                                                                  |

### Storage modes (`STORAGE`)

|                | `memory` (default)                                                                 | `postgres`                                           |
| -------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Needs          | Nothing                                                                            | Postgres + `DATABASE_URL`, migrations, seed          |
| Featured picks | Read from [`featured-picks.ts`](../apps/api/src/modules/catalog/featured-picks.ts) | The same list, written to the DB by `prisma/seed.ts` |
| Enquiries      | In process memory, newest 1000 kept; lost on restart; not shared between instances | Durable table with email status                      |
| Health         | `db: "disabled"`, always 200                                                       | `db: "up"/"down"`, 503 when down                     |
| Use for        | Running the PoC anywhere, demos, tests                                             | Docker, and anything real (leads must survive)       |

`PrismaService` is always created but connects lazily, so in memory mode it never opens a connection. Migrations, the seed and the `db:*` scripts only matter for `postgres`.

---

## 3. Folder map

```
apps/api/
├─ prisma/
│  ├─ schema.prisma            # featured_products, enquiries (business data only, no products)
│  ├─ migrations/              # SQL migrations (applied with npm run db:migrate)
│  └─ seed.ts                  # writes featured-picks.ts to the DB (STORAGE=postgres)
├─ src/
│  ├─ main.ts                  # boots the app
│  ├─ app.module.ts            # wires modules; validates env at startup
│  ├─ app.setup.ts             # trust proxy, helmet, CORS, /api/v1 prefix, error filter (shared with tests)
│  ├─ config/env.schema.ts     # every env var, validated with Zod; app refuses to start if wrong
│  ├─ common/
│  │  ├─ cache/                # CacheStore port + MemoryCache
│  │  ├─ errors/               # AppError types + AllExceptionsFilter (→ contract error body)
│  │  ├─ http/http-client.ts   # outbound fetch with timeout + 1 retry
│  │  ├─ pipes/                # ZodValidationPipe (validates with contract schemas)
│  │  └─ utils/                # slugify, titleCase, escapeHtml, withTimeout…
│  ├─ prisma/                  # PrismaService (lazy connect, health check; unused with STORAGE=memory)
│  └─ modules/
│     ├─ products/             # ProductSource port, adapters, search + product endpoints
│     ├─ catalog/              # featured + category pages; FeaturedRepository port; featured-picks.ts
│     ├─ enquiries/            # enquiry endpoint, Mailer + EnquiryRepository ports and adapters, email template
│     └─ health/               # GET /health
└─ test/                       # HTTP integration tests + fakes (mailer, product factory)
```

---

## 4. How a request flows

### `GET /api/v1/categories/electronics`

1. **`CatalogController`** validates `:slug` with `CategorySlugSchema` from the contract. A bad slug gets a 400.
2. **`CatalogService.getCategoryPage`**:
   - asks `ProductSource` for categories (unknown slug → `NotFoundError` → 404)
   - asks `ProductSource` for the category's products and `FeaturedRepository` for that category's picks, **in parallel**
   - `topRated` = the chosen products; if none are chosen, the **3 best rated**. `others` = the rest, alphabetical, never repeated.
3. The controller returns a `CategoryPage` (contract type).

### `POST /api/v1/enquiries`

1. **`ThrottlerGuard`**: 5 per minute per IP, otherwise 429.
2. **`ZodValidationPipe(CreateEnquirySchema)`**: the same schema the web form uses. Trims values and turns an empty phone into "not provided".
3. **`EnquiriesService.submit`**:
   1. honeypot (`website`) filled → return a normal-looking 201, store and send nothing
   2. product must exist (404 otherwise); its title is saved with the enquiry
   3. **save first** (`EnquiryRepository.create`), so a lead is never lost
   4. email the sales inbox (`Mailer.send`, `Reply-To` = customer, all input HTML-escaped)
   5. record `EMAILED` or `EMAIL_FAILED` (+ reason). **The customer gets 201 either way**, because their enquiry is safe.

---

## 5. Product data: `SnapshotProductSource`

Fake Store has about 20 products and no search, so the adapter loads **the whole catalogue** in one call and answers every query from it:

- **Cached** for `CATALOG_CACHE_TTL_SECONDS` (default 300). Concurrent requests share one upstream call.
- **Stale-on-error:** if a refresh fails, the last good copy is served, and the refresh is retried every 30s.
- **Bad records are skipped and logged**, so one malformed item can't break the catalogue.
- `GET /products/{id}` on Fake Store isn't used because it returns 200 with an empty body for unknown ids.

`FakeStoreProductSource` and `FixtureProductSource` both extend this base and only implement `fetchAll()`. A large real catalogue should implement `ProductSource` **directly** and push filtering and search down to its own store (SQL, OpenSearch). The port has query methods for exactly that reason.

---

## 6. Resilience behaviour

| Failure                 | What happens                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Fake Store slow or down | 5s timeout, 1 retry; then the cached catalogue is served. With no cache yet: 502           |
| DB down, browsing       | (postgres) Featured/category pages fall back to best rated after at most **1.5s**; logged  |
| DB down, enquiry        | (postgres) 500: the lead can't be saved, so the customer is told to retry                  |
| API restarts            | (memory) Stored enquiries are lost; every successfully emailed one is already in the inbox |
| SMTP down               | Enquiry saved as `EMAIL_FAILED`; the customer still gets 201 + "Thank you"                 |
| Bad config              | The app refuses to start and lists every invalid variable                                  |

---

## 7. How to…

### …switch to a new product source (e.g. a PIM or your own DB)

1. Create `src/modules/products/adapters/<name>/<name>.product-source.ts` that `extends ProductSource` (or `SnapshotProductSource` if the catalogue is small).
2. Map the source's shape to the contract `Product` **inside the adapter**. Nothing outside should see the source's shape.
3. Add a `case '<name>'` in `product-source.factory.ts`, and add the value to `PRODUCT_SOURCE` in `config/env.schema.ts` and `.env.example`.
4. Add an adapter spec like `fakestore.product-source.spec.ts`. Run the integration tests: they don't change.

### …switch email provider (e.g. AWS SES)

- **SES via SMTP:** configuration only. Set `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD` (from a secret store), `MAIL_FROM` (a verified sender).
- **API-based provider:** add an adapter that `extends Mailer`, plus a `case` in `mailer.factory.ts`.

### …change the chosen "top rated" products

Edit `HOME_PICKS` / `CATEGORY_PICKS` in [`featured-picks.ts`](../apps/api/src/modules/catalog/featured-picks.ts). With `STORAGE=memory`, restart the API; with `postgres`, run `npm run db:seed`. Ids the source doesn't have are skipped (and logged).

### …add an endpoint

1. Add request/response schemas to `packages/contracts`, so the web app gets the types too.
2. Controller method: validate with `new ZodValidationPipe(Schema)` and call a service.
3. Service: the business rules, depending only on ports. Throw `NotFoundError` / `ValidationError`, never `HttpException`.
4. Tests: a service unit test with fakes, plus a case in `test/*.int-spec.ts`.

### …add a DB table

Edit `prisma/schema.prisma`, run `npm run db:migrate:dev -w @catalogue/api -- --name <change>`, then wrap access in a repository port with **both** a Prisma and an in-memory adapter, and add a `case` to a storage factory, so `STORAGE=memory` keeps working.

---

## 8. Configuration

All variables are validated at startup by [`config/env.schema.ts`](../apps/api/src/config/env.schema.ts); the template is [`.env.example`](../.env.example).

| Variable                                  | Default                        | Notes                                      |
| ----------------------------------------- | ------------------------------ | ------------------------------------------ |
| `STORAGE`                                 | `memory`                       | `postgres` = durable storage               |
| `DATABASE_URL`                            | empty                          | Required when `STORAGE=postgres`           |
| `PRODUCT_SOURCE`                          | `fakestore`                    | `fixture` = offline bundled catalogue      |
| `CATALOG_CACHE_TTL_SECONDS`               | `300`                          | Product cache lifetime                     |
| `MAILER`                                  | `smtp`                         | `log` = print instead of sending           |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `localhost` / `1025` / `false` | Mailpit locally                            |
| `SMTP_USER` / `SMTP_PASSWORD`             | empty                          | For real providers; keep in a secret store |
| `MAIL_FROM` / `SALES_INBOX_EMAIL`         | `…@catalogue.local`            | Sender / where enquiries go                |
| `ENQUIRY_RATE_LIMIT_PER_MIN`              | `5`                            | Per IP                                     |
| `CORS_ORIGIN`                             | `http://localhost:5173`        | Comma-separated                            |
| `TRUST_PROXY_HOPS`                        | `0`                            | Proxies in front of the API (1 in Docker)  |

### Running without Docker: `npm run dev`

[`scripts/dev.mjs`](../scripts/dev.mjs) builds the contract, then runs three processes with labelled output:

- **inbox:** [`dev/dev-inbox.mjs`](../apps/api/dev/dev-inbox.mjs), a dev-only stand-in for Mailpit on the same ports.
  - It runs a real SMTP server on `127.0.0.1:1025` (`smtp-server`), parses messages with `mailparser`, and lists them at http://localhost:8025.
  - It keeps the newest 200 in memory and shows email HTML in a sandboxed iframe with a no-script CSP.
  - It isn't compiled into the API or its Docker image.
- **api:** `tsc-watch`, so it rebuilds and restarts on change.
- **web:** Vite.

The API needs no special setting for this. The defaults already send SMTP to `localhost:1025`, which is the dev inbox here and Mailpit in Docker.

### Running in Docker

`docker compose up --build` builds the targets of the root [`Dockerfile`](../Dockerfile) and starts them in order:

1. **`db`** and **`mailpit`** start and report healthy.
2. **`migrate`** (one-shot) runs `prisma migrate deploy` and the seed, then exits. Migrations never run inside the API, so several API replicas can't race each other.
3. **`api`** starts: production dependencies only, non-root user, `NODE_ENV=production`. It isn't published to the host; its health check calls `/health`.
4. **`web`** (nginx) starts once the API is healthy. It serves the React build and proxies `/api/*` and `/health` to `api:3000`.

The compose file sets `STORAGE=postgres`, the in-network hosts (`db`, `mailpit`) and `TRUST_PROXY_HOPS=1`. Values from `.env` (`PRODUCT_SOURCE`, `SALES_INBOX_EMAIL`, …) still override the defaults. Logs: `docker compose logs -f api`.

---

## 9. Testing

```bash
npm test -w @catalogue/api          # all API tests (~90)
npx jest path/to/file.spec.ts       # one file (run inside apps/api)
```

| Kind        | Where                             | What it covers                                                                                                                                      |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | `src/**/*.spec.ts`                | Services with in-memory fakes, the mapper, cache, HTTP retry, email template escaping, env parsing                                                  |
| SMTP        | `smtp.mailer.spec.ts`             | Real SMTP round trip against an in-process server                                                                                                   |
| Integration | `test/*.int-spec.ts`              | The real Nest app + HTTP pipeline via Supertest, fixture products, faked DB/email ([create-test-app.ts](../apps/api/test/utils/create-test-app.ts)) |
| Rate limit  | `test/rate-limit.int-spec.ts`     | The real throttler guard, including clients told apart by `X-Forwarded-For` behind a proxy                                                          |
| No database | `test/memory-storage.int-spec.ts` | `STORAGE=memory` with the real storage adapters and no `DATABASE_URL`: health, picks, enquiry                                                       |

The dev inbox has its own test (`dev/dev-inbox.test.mjs`, Node's built-in runner, part of `npm test`): a real nodemailer → SMTP → inbox round trip.

Tests never touch the network or a real DB ([test/setup-env.ts](../apps/api/test/setup-env.ts)). Most integration suites run as `STORAGE=postgres` with the repositories swapped for in-memory ones, so the DB up/down health logic is covered too.

---

## 10. Gotchas

- **Never `import type` an injected class.** Nest's DI reads constructor types at runtime. ESLint is configured to know this; don't "fix" it.
- **Throw domain errors** (`NotFoundError`, `ValidationError`), not Nest `HttpException`s. The global filter maps them to the contract shape.
- **Upstream shapes stay inside adapters.** If you're importing a Fake Store type outside `adapters/fakestore`, stop.
- **Rate limiting and caching are in-memory.** Running more than one API instance needs Redis-backed versions first.
- **Behind a proxy, set `TRUST_PROXY_HOPS`** to the number of proxies (nginx = 1; CloudFront + ALB = 2). Too low and every customer shares one rate limit. Too high and a client can fake its IP with `X-Forwarded-For`.
- **The enquiry rate limit counts per API instance**, and restarts reset it (in-memory store).
- **`STORAGE=memory` is not for production.** Leads vanish on restart and aren't shared between instances.
- **Config is read when `AppModule` is imported.** A test that needs different env must set it before that import (see `test/utils/use-memory-storage.ts`).
