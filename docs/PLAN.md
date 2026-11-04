# Product Catalogue PoC — Implementation Plan

Status: **Approved for build** · Owner: Ankit Srivastava · Stack: React + TypeScript / NestJS + TypeScript / PostgreSQL

This is the spec the build follows. Anything that changes during the build is recorded in `DECISIONS.md`. The prompts, mistakes and corrections are recorded in `AI_USAGE.md`.

---

## 1. Goals and non-goals

### Goals

- Meet all five acceptance criteria (Home, Category, Search, Product, Enquiry) end to end.
- Build a **foundation, not a throwaway**. The three things the brief says will change (product data source, look and feel, email provider) can each be swapped by **adding an adapter or editing one theme file**, with no rewrites.
- Let a reviewer run everything with `docker compose up` in under 10 minutes, with no paid accounts.
- Cover the critical path with tests that make change safe.

### Non-goals (PoC)

Authentication, admin UI, cart or checkout, pagination, i18n, payments, analytics and production deployment. These are listed in §13 with reasons.

---

## 2. Technology choices

| Concern          | Choice                                                        | Reason                                                                                                                       |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Monorepo         | npm workspaces (`apps/api`, `apps/web`, `packages/contracts`) | One repo, and the API contract is shared between client and server                                                           |
| Client           | React 18 + TypeScript + Vite                                  | Allowed by the brief, fast dev server, simple build                                                                          |
| UI kit           | Ant Design v5                                                 | Ready-made components plus a theme system (`ConfigProvider`, `darkAlgorithm`, `cssVar`)                                      |
| Styling          | AntD theme tokens + CSS Modules that use AntD CSS variables   | No inline styles, and every colour and spacing value comes from the theme                                                    |
| State            | MobX + mobx-react-lite                                        | Your choice; stores hold the logic and components stay thin                                                                  |
| Routing          | React Router v6                                               | URL-driven pages (search term in the query string, so links can be shared)                                                   |
| HTTP (client)    | axios behind a `httpClient` wrapper                           | One place for base URL, timeouts and error handling                                                                          |
| Backend          | NestJS 10 (Node 20, TypeScript)                               | Modules and dependency injection, so each swappable part is a single provider binding                                        |
| Validation       | Zod schemas in `packages/contracts`                           | The same rules on client and server; DTO types come from the schemas                                                         |
| DB               | PostgreSQL 16                                                 | Relational and dependable. AWS RDS / Aurora compatible                                                                       |
| ORM              | Prisma                                                        | Typed client, migrations, seed script                                                                                        |
| Email            | nodemailer (SMTP) → **Mailpit** locally                       | Free and runs in Docker. The reviewer sees the "sales inbox" at http://localhost:8025. An AWS SES adapter is a later drop-in |
| Cache            | In-memory TTL cache behind a `CacheStore` interface           | The Fake Store API is slow and has no search. Redis/ElastiCache can be swapped in later                                      |
| Rate limiting    | @nestjs/throttler                                             | Protects the enquiry endpoint                                                                                                |
| Security headers | helmet                                                        | Standard protection                                                                                                          |
| Logging          | Nest Logger (JSON in prod)                                    | Enough for the PoC; pino or CloudWatch later                                                                                 |
| Tests (api)      | Jest + Supertest + nock                                       | Unit and HTTP integration tests                                                                                              |
| Tests (web)      | Vitest + React Testing Library + MSW                          | Component, store and page tests without a real backend                                                                       |
| E2E (optional)   | Playwright                                                    | One happy-path test through all five acceptance criteria                                                                     |
| Runtime          | Docker Compose: `db`, `mailpit`, `api`, `web` (nginx)         | One command to run                                                                                                           |

### Why a database at all?

The Fake Store API supplies product data. Two kinds of data belong to **the business** and need a home of their own:

1. **Featured picks:** "GIVEN _I have chosen_ 5 products". This is the entrepreneur's decision, not a value from the API.
2. **Enquiries:** each enquiry is a sales lead. It is saved _before_ the email is sent, so a failed email never loses the lead.

Products are **not** copied into Postgres. They are read through the `ProductSource` interface. When the real catalogue arrives (a CMS, PIM or our own DB), we add a new adapter.

---

## 3. Architecture

```
┌──────────────────────── apps/web (React) ────────────────────────┐
│ pages ─► components (presentational, props only)                 │
│   │                                                              │
│   └─► hooks (useStores, useCategory, useSearch, …)               │
│          └─► MobX stores (RootStore → domain stores)             │
│                 └─► services (productService, enquiryService)    │
│                        └─► httpClient (axios, error normalising) │
└──────────────────────────────┬───────────────────────────────────┘
                               │  REST  /api/v1  (same origin via nginx / vite proxy)
┌──────────────────────────────▼──────── apps/api (NestJS) ────────┐
│ Controllers  – HTTP only: parse, validate (Zod pipe), map errors │
│ Services     – business rules (featured, category split, search, │
│                enquiry flow)                                     │
│ Ports        – ProductSource · FeaturedRepository ·              │
│                EnquiryRepository · Mailer · CacheStore           │
│ Adapters     – FakeStoreProductSource · FixtureProductSource     │
│                PrismaFeaturedRepository · PrismaEnquiryRepository│
│                SmtpMailer (→ SesMailer later) · MemoryCache      │
└───────┬───────────────────────┬──────────────────────┬───────────┘
        ▼                       ▼                      ▼
  fakestoreapi.com         PostgreSQL               Mailpit (SMTP)
```

### Boundary rules (enforced by structure and lint)

1. **The client never calls fakestoreapi.com.** It only knows `/api/v1`.
2. **The API returns its own `Product` shape**, not the Fake Store shape. Mapping happens inside the adapter, so a source change never reaches the client.
3. **Services depend on ports (interfaces), not on adapters.** Adapters are chosen in the module by env config (`PRODUCT_SOURCE=fakestore|fixture`, `MAILER=smtp|log`).
4. **Components never import services or axios.** Data flows service → store → hook → page → component props.
5. **No inline styles.** ESLint `react/forbid-dom-props` and `react/forbid-component-props` ban `style`.

### How each expected change lands

| Expected change                                | What we touch                                                                                                      | What stays the same                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| New product data source (Shopify, own DB, PIM) | Add `XProductSource` adapter, set `PRODUCT_SOURCE=x`                                                               | Services, controllers, API contract, entire frontend |
| New email provider (SES, SendGrid)             | Add `XMailer` adapter, set `MAILER=x`                                                                              | Enquiry service, DB, frontend                        |
| New look and feel from the creative agency     | `apps/web/src/theme/tokens.ts` (+ CSS Modules if layout changes)                                                   | Stores, services, page logic                         |
| Dark / light mode                              | Already handled through `ThemeStore`                                                                               | —                                                    |
| Scale (more traffic)                           | API is stateless, so run more containers; swap `MemoryCache` → `RedisCache`; enquiry email → outbox + worker (SQS) | Contract, frontend                                   |

---

## 4. Repository layout

```
officeworks/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ main.ts                     # bootstrap: helmet, CORS, global prefix, pipes, filter
│  │  │  ├─ app.module.ts
│  │  │  ├─ config/
│  │  │  │  ├─ env.schema.ts            # Zod-validated env, fail fast on boot
│  │  │  │  └─ config.module.ts
│  │  │  ├─ common/
│  │  │  │  ├─ cache/                   # CacheStore port + MemoryCache adapter
│  │  │  │  ├─ http/                    # outbound HTTP wrapper (timeout, retry, logging)
│  │  │  │  ├─ errors/                  # AppError types + global exception filter
│  │  │  │  ├─ pipes/zod-validation.pipe.ts
│  │  │  │  └─ utils/slugify.ts
│  │  │  ├─ prisma/                     # PrismaService + module
│  │  │  ├─ modules/
│  │  │  │  ├─ products/
│  │  │  │  │  ├─ products.controller.ts
│  │  │  │  │  ├─ products.service.ts   # getById, search
│  │  │  │  │  ├─ ports/product-source.port.ts
│  │  │  │  │  └─ adapters/
│  │  │  │  │     ├─ fakestore/fakestore.product-source.ts
│  │  │  │  │     ├─ fakestore/fakestore.mapper.ts
│  │  │  │  │     ├─ fixture/fixture.product-source.ts   # offline/tests
│  │  │  │  │     └─ cached.product-source.ts           # decorator around any source
│  │  │  │  ├─ catalog/
│  │  │  │  │  ├─ catalog.controller.ts # featured, categories, category page
│  │  │  │  │  ├─ catalog.service.ts
│  │  │  │  │  ├─ ports/featured.repository.port.ts
│  │  │  │  │  └─ adapters/prisma-featured.repository.ts
│  │  │  │  ├─ enquiries/
│  │  │  │  │  ├─ enquiries.controller.ts
│  │  │  │  │  ├─ enquiries.service.ts
│  │  │  │  │  ├─ ports/enquiry.repository.port.ts
│  │  │  │  │  ├─ ports/mailer.port.ts
│  │  │  │  │  ├─ adapters/prisma-enquiry.repository.ts
│  │  │  │  │  ├─ adapters/smtp.mailer.ts
│  │  │  │  │  ├─ adapters/log.mailer.ts              # dev fallback
│  │  │  │  │  └─ templates/sales-enquiry.template.ts # HTML-escaped
│  │  │  │  └─ health/health.controller.ts
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  ├─ migrations/
│  │  │  └─ seed.ts                     # featured picks
│  │  ├─ test/                          # integration (supertest) + fixtures
│  │  ├─ Dockerfile
│  │  └─ package.json
│  └─ web/
│     ├─ src/
│     │  ├─ main.tsx / App.tsx / router.tsx
│     │  ├─ api/
│     │  │  ├─ httpClient.ts            # axios instance + ApiError normalisation
│     │  │  └─ services/
│     │  │     ├─ productService.ts
│     │  │     ├─ catalogService.ts
│     │  │     └─ enquiryService.ts
│     │  ├─ stores/
│     │  │  ├─ RootStore.ts             # builds stores, injects services
│     │  │  ├─ StoreProvider.tsx
│     │  │  ├─ utils/AsyncResource.ts   # generic {status,data,error,load}
│     │  │  ├─ CatalogStore.ts          # featured, categories, category pages
│     │  │  ├─ ProductStore.ts          # product details (cached by id)
│     │  │  ├─ SearchStore.ts
│     │  │  ├─ EnquiryStore.ts
│     │  │  └─ ThemeStore.ts
│     │  ├─ hooks/
│     │  │  ├─ useStores.ts
│     │  │  ├─ useFeaturedProducts.ts
│     │  │  ├─ useCategories.ts
│     │  │  ├─ useCategoryPage.ts
│     │  │  ├─ useProduct.ts
│     │  │  └─ useSearch.ts
│     │  ├─ theme/
│     │  │  ├─ tokens.ts                # brand tokens (single source of truth)
│     │  │  ├─ antdTheme.ts             # builds AntD ThemeConfig for light/dark
│     │  │  └─ AppThemeProvider.tsx     # ConfigProvider + cssVar, observes ThemeStore
│     │  ├─ components/                 # global, reusable, props-only
│     │  │  ├─ layout/AppLayout, AppHeader, AppFooter
│     │  │  ├─ navigation/CategoryNav
│     │  │  ├─ search/SearchBar
│     │  │  ├─ product/ProductCard, ProductGrid, ProductSection, Price, Rating
│     │  │  ├─ feedback/PageState (loading | error+retry | empty)
│     │  │  ├─ enquiry/EnquiryForm, EnquiryModal, EnquiryThankYou
│     │  │  └─ theme/ThemeToggle
│     │  ├─ pages/
│     │  │  ├─ HomePage/ CategoryPage/ SearchPage/ ProductPage/ NotFoundPage/
│     │  ├─ styles/global.css           # resets only, uses CSS vars
│     │  └─ test/                       # MSW handlers, render helpers
│     ├─ nginx.conf                     # serves SPA + proxies /api → api:3000
│     ├─ Dockerfile
│     └─ package.json
├─ packages/
│  └─ contracts/                        # Zod schemas + inferred TS types (API contract)
│     └─ src/{product,category,catalog,enquiry,error}.ts
├─ e2e/                                 # optional Playwright
├─ docker-compose.yml
├─ .env.example
├─ CLAUDE.md                            # agent rules (boundaries, no inline styles, tests)
├─ README.md · DECISIONS.md · AI_USAGE.md
└─ docs/PLAN.md                         # this file
```

---

## 5. Data model (Prisma / PostgreSQL)

```prisma
enum FeaturedScope { HOME  CATEGORY }

model FeaturedProduct {
  id           String        @id @default(uuid())
  scope        FeaturedScope
  categorySlug String?       // null when scope = HOME
  productId    String        // id in the active ProductSource (string → source-agnostic)
  position     Int           // display order
  createdAt    DateTime      @default(now())

  @@unique([scope, categorySlug, productId])
  @@index([scope, categorySlug, position])
}

enum EnquiryStatus { RECEIVED  EMAILED  EMAIL_FAILED }

model Enquiry {
  id            String        @id @default(uuid())
  productId     String
  productTitle  String        // snapshot at time of enquiry (source may change)
  name          String        @db.VarChar(100)
  email         String        @db.VarChar(254)
  phone         String?       @db.VarChar(30)
  message       String        @db.VarChar(2000)
  status        EnquiryStatus @default(RECEIVED)
  emailError    String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status, createdAt])
}
```

**Seed** (`prisma/seed.ts`, safe to re-run): 5 HOME picks (Fake Store IDs, e.g. 1, 5, 9, 13, 18) plus 2–3 picks for a couple of categories. The IDs live in one seed constant so they're easy to change.

---

## 6. API contract (`/api/v1`)

All responses are JSON. Every error uses one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ … ] } }
```

Codes: `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `RATE_LIMITED` 429, `UPSTREAM_UNAVAILABLE` 502, `INTERNAL` 500.

### Shared types (`packages/contracts`)

```ts
Product   = { id: string; title: string; description: string; price: { amount: number; currency: 'AUD' };
              imageUrl: string; category: { slug: string; name: string };
              rating: { average: number; count: number } }
Category  = { slug: string; name: string }
CategoryPage = { category: Category; topRated: Product[]; others: Product[] }
CreateEnquiry = { productId: string; name: string; email: string; phone?: string; message: string; website?: string /* honeypot */ }
EnquiryCreated = { id: string; status: 'received' }
```

Currency is assumed to be AUD (an assumption: Fake Store prices have no currency).

### Endpoints

| Method | Path                           | Returns                         | AC           |
| ------ | ------------------------------ | ------------------------------- | ------------ |
| GET    | `/health`                      | `{ status, db, productSource }` | ops          |
| GET    | `/api/v1/catalog/featured`     | `Product[]` (5)                 | Home         |
| GET    | `/api/v1/categories`           | `Category[]`                    | Category nav |
| GET    | `/api/v1/categories/:slug`     | `CategoryPage`                  | Category     |
| GET    | `/api/v1/products?search=term` | `Product[]`                     | Search       |
| GET    | `/api/v1/products/:id`         | `Product`                       | Product page |
| POST   | `/api/v1/enquiries`            | `201 EnquiryCreated`            | Enquiry      |

### Business rules

- **Featured (home):** load HOME picks in `position` order, then look them up from the source. A pick whose product no longer exists is skipped and a warning is logged. If fewer than 5 remain, fill up with the highest-rated products not already shown, so the home page is never empty.
- **Category page:** `topRated` = that category's CATEGORY picks, or the top 3 by `rating.average` if none are configured. `others` = the rest of the category, sorted by title. An unknown slug returns 404.
- **Category slug:** Fake Store names contain spaces and apostrophes ("men's clothing"), so the API turns them into slugs (`mens-clothing`) and keeps a slug → name map.
- **Search:** trim the term, which must be 1–100 characters. Match is a case-insensitive substring against `title + description + category name`. Results are ranked with title matches first. An empty term returns 400 (the UI also disables the button).
- **Product:** unknown id returns 404. The id must be a non-empty string of at most 64 characters.
- **Enquiry:**
  1. Validate with Zod. A filled honeypot gets a silent 201 and nothing is saved.
  2. Check that the product exists (404 otherwise) and snapshot its title.
  3. Save the enquiry with status `RECEIVED`.
  4. Send the email to `SALES_INBOX_EMAIL` with `Reply-To` set to the customer. All user values are HTML-escaped.
  5. Update the status to `EMAILED`, or to `EMAIL_FAILED` with the error.
  6. Return 201 **in both cases**: the lead is safe and the customer sees "Thank you". The failure is logged and visible in the DB, and the retry/outbox is listed under next steps.
  - Rate limit: 5 requests per minute per IP on this route.

### Upstream resilience (Fake Store adapter)

- 5s timeout and 1 retry on network or 5xx errors.
- `CachedProductSource` keeps the whole catalogue in memory with a TTL (default 300s, `CATALOG_CACHE_TTL_SECONDS`). Search and category reads use the cache, so the upstream gets about one call per TTL.
- **Stale-on-error:** if a refresh fails, the last good copy is served; with no copy at all, the API returns 502 `UPSTREAM_UNAVAILABLE`.
- `PRODUCT_SOURCE=fixture` serves a bundled JSON file. Tests and e2e use it, and it shows the swap in action.

---

## 7. Frontend design

### Routes

| Path              | Page         | Data                                                                 |
| ----------------- | ------------ | -------------------------------------------------------------------- |
| `/`               | HomePage     | featured                                                             |
| `/category/:slug` | CategoryPage | `ProductSection "Top rated"` + `ProductSection "More in {category}"` |
| `/search?q=term`  | SearchPage   | results for `q`, with "No products match" when empty                 |
| `/product/:id`    | ProductPage  | details + **Enquire** button → `EnquiryModal`                        |
| `*`               | NotFoundPage | —                                                                    |

The header appears on every page: logo, `SearchBar`, `CategoryNav`, `ThemeToggle`.

### Search behaviour

`SearchBar` is a controlled input. **Search** button or Enter navigates to `/search?q=…`, and `SearchPage` reads `q` from the URL and calls `SearchStore.search(q)`. Because the term is in the URL, results survive refresh and back/forward, and links can be shared. It doesn't search on every keystroke (per the acceptance criteria).

### State management (MobX)

- `AsyncResource<T>` is a generic helper with `status: 'idle'|'loading'|'success'|'error'`, `data`, `error` and `load(fn)`. Every store uses it, so loading and error handling is written once.
- `RootStore` builds all stores and **injects services into them** (constructor injection). Tests pass in fake services.
- `CatalogStore`: `featured`, `categories`, `categoryPages: Map<slug, AsyncResource<CategoryPage>>`
- `ProductStore`: `byId: Map<id, AsyncResource<Product>>` (reuses a product already fetched)
- `SearchStore`: `term`, `results`. It ignores out-of-date responses, so only the latest request wins.
- `EnquiryStore`: `status: 'idle'|'submitting'|'success'|'error'`, `submit(dto)`, `reset()`
- `ThemeStore`: `mode: 'light'|'dark'`. It starts from localStorage or the OS setting and saves changes.

### Hooks

Hooks are thin and connect stores to React: they read route params, trigger loads in `useEffect` and return the store's observable state. Pages call hooks; components only get props.

### Theming (no inline styles)

- `theme/tokens.ts` holds the brand tokens (primary colour, radius, font family, spacing scale) and is the **only** file the creative agency's look needs to change.
- `antdTheme.ts` builds `ThemeConfig` with `algorithm: mode === 'dark' ? darkAlgorithm : defaultAlgorithm`, `token` from tokens.ts and `cssVar: true`.
- CSS Modules use AntD's CSS variables (`var(--ant-color-bg-container)`, `var(--ant-padding-lg)`), so custom layout styles follow the theme automatically.
- `ThemeToggle` calls `themeStore.toggle()`, and the whole app re-themes.
- Lint rules ban `style=` props, and no hex colours are allowed outside `tokens.ts` (enforced by a stylelint rule).

### Reusable components (props-only)

| Component         | Props (summary)                                   | Used by                |
| ----------------- | ------------------------------------------------- | ---------------------- |
| `ProductCard`     | `product`, `to`                                   | Home, Category, Search |
| `ProductGrid`     | `products`, `renderItem?`                         | Home, Category, Search |
| `ProductSection`  | `title`, `products`, `emptyText`                  | Category (×2), Home    |
| `PageState`       | `status`, `error`, `onRetry`, `empty`, `children` | every page             |
| `Price`, `Rating` | `price` / `rating`                                | Card, Product page     |
| `SearchBar`       | `initialValue`, `onSearch`                        | Header                 |
| `CategoryNav`     | `categories`, `activeSlug`                        | Header                 |
| `EnquiryForm`     | `product`, `onSubmit`, `submitting`               | EnquiryModal           |
| `EnquiryThankYou` | `productTitle`, `onClose`                         | EnquiryModal           |

### Enquiry UX

The product page has an **Enquire** button that opens `EnquiryModal` with `EnquiryForm`: name*, email*, phone, message* (pre-filled with "I'm interested in {title}") and a hidden honeypot. The same Zod schema from `contracts` validates on the client. On submit: button spinner → success shows `EnquiryThankYou` ("Thank you, {name}. Our sales team will be in touch.") → an error shows an alert with a retry and keeps the form data.

### API layer

- `httpClient` is an axios instance with `baseURL` from `import.meta.env.VITE_API_BASE_URL` (default `/api/v1`) and a 10s timeout. An interceptor turns every failure into an `ApiError { code, message, status, details }`.
- Services return the typed contracts and contain no UI logic.

---

## 8. Configuration (`.env.example`)

```
# --- api ---
NODE_ENV=development
API_PORT=3000
DATABASE_URL=postgresql://catalogue:catalogue@db:5432/catalogue
PRODUCT_SOURCE=fakestore            # fakestore | fixture
FAKESTORE_BASE_URL=https://fakestoreapi.com
CATALOG_CACHE_TTL_SECONDS=300
MAILER=smtp                         # smtp | log
SMTP_HOST=mailpit
SMTP_PORT=1025
MAIL_FROM="Catalogue <no-reply@catalogue.local>"
SALES_INBOX_EMAIL=sales@catalogue.local
CORS_ORIGIN=http://localhost:5173
ENQUIRY_RATE_LIMIT_PER_MIN=5

# --- web ---
VITE_API_BASE_URL=/api/v1
```

No real secrets exist (Mailpit needs no credentials). `.env` is git-ignored. The API validates its env with Zod at startup and exits with a clear message if something is wrong.

---

## 9. Local run (Docker Compose)

| Service   | Image                         | Port                   | Notes                                                                                    |
| --------- | ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `db`      | postgres:16-alpine            | 5432                   | healthcheck `pg_isready`, named volume                                                   |
| `mailpit` | axllent/mailpit               | 8025 (UI), 1025 (SMTP) | the "sales inbox"                                                                        |
| `api`     | built from `apps/api`         | 3000                   | runs `prisma migrate deploy && prisma db seed && node dist/main`; waits for a healthy db |
| `web`     | built from `apps/web` (nginx) | 8080                   | serves the SPA, proxies `/api` → `api:3000` (same origin, no CORS in Docker)             |

Reviewer steps: `cp .env.example .env` → `docker compose up --build` → open http://localhost:8080 (app) and http://localhost:8025 (inbox).
Dev mode without Docker: `docker compose up db mailpit`, then `npm run dev` (runs the api and web together; the Vite proxy sends `/api` to `localhost:3000`).

---

## 10. Testing strategy

Each acceptance criterion has at least one test.

| AC            | Backend test                                                                                                                                                                          | Frontend test                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Home          | `CatalogService.getFeatured`: order, skips missing picks, tops up to 5 · integration `GET /catalog/featured`                                                                          | `HomePage` renders 5 `ProductCard`s (MSW)                                                                       |
| Category      | `getCategoryPage`: picks vs rating fallback, others exclude topRated, unknown slug → 404 · slugify cases                                                                              | `CategoryPage` shows both sections; clicking a nav link changes the route                                       |
| Search        | matcher: case-insensitive, title/description/category, no false positives, empty → 400                                                                                                | `SearchBar` click/Enter navigates with `q`; `SearchPage` shows only the returned items and an empty state       |
| Product       | `GET /products/:id` 200 / 404                                                                                                                                                         | clicking a `ProductCard` goes to the product page, which shows the details                                      |
| Enquiry       | service: saves then emails → EMAILED; mailer throws → EMAIL_FAILED and still 201; honeypot → nothing saved; invalid → 400; HTML escaping in template · integration with a fake mailer | `EnquiryForm` validation messages; submit shows "Thank you"; server error keeps the form data                   |
| Cross-cutting | FakeStore mapper (nock fixtures), cache TTL + stale-on-error, error filter shape                                                                                                      | `AsyncResource` transitions, `ThemeStore` toggle saves its setting, `SearchStore` ignores out-of-date responses |

- **Unit tests** use in-memory fake adapters, so they make no network or DB calls and run fast.
- **API integration tests** boot the Nest app with `PRODUCT_SOURCE=fixture` and fake repositories/mailer through Nest provider overrides, then call it with Supertest. A small DB test against Postgres (compose `db`) covers the Prisma repositories.
- **Optional e2e:** one Playwright test against `docker compose`: home → category → product → enquire → thank you, then check that Mailpit received the email through its REST API.
- Scripts: `npm test` (all workspaces), `npm run test:e2e`.

---

## 11. Phases and tasks

The order is **contract first, then backend, then frontend**. The contract package is what lets the frontend (or a second engineer or AI agent) work in parallel against MSW mocks while the backend is being built.

### Phase 0 — Foundation (≈30 min)

- [ ] npm workspaces root, TypeScript base config, ESLint + Prettier (including the no-`style` rule), `.gitignore`, `.editorconfig`
- [ ] `packages/contracts`: Zod schemas and types for Product, Category, CategoryPage, CreateEnquiry, ApiError
- [ ] `docker-compose.yml` with `db` and `mailpit`; `.env.example`
- [ ] `CLAUDE.md`: architecture rules, folder conventions, "tests with every change", no direct upstream calls from the client, no inline styles
- [ ] README skeleton
- **Done when:** `npm install` and `npm run lint` pass, and `docker compose up db mailpit` is healthy.

### Phase 1 — Backend: catalogue (≈60 min)

- [ ] Nest app bootstrap: config module with Zod env, helmet, CORS, `/api/v1` prefix, Zod validation pipe, global exception filter, health check
- [ ] `ProductSource` port, `FakeStoreProductSource` + mapper, `FixtureProductSource`, `CachedProductSource` decorator, `MemoryCache`
- [ ] Provider factory that picks the source from `PRODUCT_SOURCE`
- [ ] Prisma schema, first migration, seed of featured picks, `FeaturedRepository`
- [ ] `CatalogService` + controller (featured, categories, category page)
- [ ] `ProductsService` + controller (by id, search)
- [ ] Unit tests and integration tests for the above
- **Done when:** every GET endpoint returns contract-valid JSON and the tests pass.

### Phase 2 — Backend: enquiry (≈30 min)

- [ ] `Enquiry` model + migration, `EnquiryRepository`
- [ ] `Mailer` port, `SmtpMailer` (nodemailer), `LogMailer`, HTML-escaped template
- [ ] `EnquiriesService` (flow in §6), controller, throttler, honeypot
- [ ] Tests: happy path, invalid input, unknown product, mailer failure, honeypot, escaping
- **Done when:** the POST creates a row and the email shows up in Mailpit.

### Phase 3 — Frontend: shell + browsing (≈60 min)

- [ ] Vite app, router, `AppThemeProvider` + tokens + `ThemeStore` + `ThemeToggle`
- [ ] `httpClient` + services
- [ ] `AsyncResource`, `RootStore`, `StoreProvider`, domain stores, hooks
- [ ] Shared components: layout, header, `SearchBar`, `CategoryNav`, `ProductCard`, `ProductGrid`, `ProductSection`, `PageState`, `Price`, `Rating`
- [ ] Pages: Home, Category, Search, Product, NotFound
- [ ] Responsive grid using AntD `Row/Col` breakpoints
- [ ] Vitest + MSW tests for the pages and key components
- **Done when:** the first four acceptance criteria can be clicked through in the browser in both light and dark mode.

### Phase 4 — Frontend: enquiry (≈25 min)

- [ ] `EnquiryStore`, `EnquiryModal`, `EnquiryForm` (shared Zod schema), `EnquiryThankYou`
- [ ] Tests: validation, success, error-and-retry
- **Done when:** the full enquiry flow works end to end and the email appears in Mailpit.

### Phase 5 — Containerise, harden, document (≈40 min)

- [ ] Multi-stage Dockerfiles for api and web, nginx config, full `docker compose up --build`
- [ ] Fresh-clone check: time the README steps (must be under 10 minutes)
- [ ] Optional Playwright happy path
- [ ] `README.md` (stack choice + why, setup, URLs, scripts, configuration, troubleshooting)
- [ ] `DECISIONS.md` (assumptions, cuts, how it grows, next day)
- [ ] `AI_USAGE.md` (tools/models, CLAUDE.md, this plan, key prompts, AI mistakes and how they were caught)
- [ ] Time log
- [ ] PR description draft

**Estimate:** about 4 hours, which is over the 2–3 hour time-box. The brief allows that if reported honestly. **If time runs short, cut in this order:** Playwright → per-category picks (rating fallback only) → stale-on-error cache → dark-mode polish. Never cut: layer boundaries, adapters, critical-path tests or docs.

---

## 12. Assumptions (copied into DECISIONS.md)

1. "Top rated" products are **chosen by the entrepreneur** and saved in the DB through a seed. There is no admin UI in the PoC; the seed file is the stand-in.
2. Category "top rated" uses that category's chosen picks; with none, the top 3 by Fake Store rating. "Additional products" means everything else in the category.
3. Search runs on button click or Enter only. It is a case-insensitive substring match over title, description and category, so "only see matching products" is strictly true.
4. Enquiry fields: name, email, message (required) and phone (optional). One enquiry is for one product.
5. The sales inbox is a single configured address. Locally it's Mailpit, so no real email is sent.
6. If the email fails after the enquiry is saved, the customer still sees "Thank you" because the lead is saved. The failure is recorded for retry.
7. Prices are shown in AUD. Fake Store has no currency.
8. Web only (React). The layout is responsive, so phones are covered without a native app.
9. Roughly 20 products, so no pagination. The contract can add `page`/`limit` later without breaking anything.
10. No customer accounts or auth. The enquiry endpoint is public, with a rate limit and a honeypot.

## 13. Dropped or simplified (and why)

| Item                            | Why                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Admin UI for featured picks     | Not in the acceptance criteria; the seed covers "I have chosen". First item for the next day |
| Outbox / async email worker     | Synchronous send + saved status is enough to show the design; the outbox needs a queue       |
| Customer confirmation email     | The acceptance criteria only require the sales email + an on-screen thank you                |
| Redis cache                     | One instance doesn't need it; the port is ready                                              |
| Pagination, filters, sorting UI | The data set is tiny                                                                         |
| Cloud deployment / IaC          | Not required; the design is AWS-compatible (see §14)                                         |

## 14. Growth path (beyond the PoC)

- **AWS mapping:** web → S3 + CloudFront; api → ECS Fargate (stateless, scaled out behind an ALB); db → RDS Postgres; cache → ElastiCache Redis; email → SES adapter; outbox → SQS + worker; secrets → SSM / Secrets Manager; logs → CloudWatch.
- **Real catalogue:** a new `ProductSource` (PIM/CMS/our own DB). Search moves to Postgres full-text or OpenSearch behind a `SearchIndex` port.
- **Admin:** an authenticated back-office (Cognito) to manage featured picks and view enquiries.
- **Contract:** generate OpenAPI from the Zod schemas and a typed client for future mobile apps.

## 15. With another day

1. Admin page plus API for featured picks and the enquiry list, with auth.
2. Transactional outbox + retry worker for email; customer confirmation email.
3. CI (GitHub Actions: lint, typecheck, tests, docker build) and a Playwright run in CI.
4. Generated OpenAPI docs + contract tests against the FakeStore adapter.
5. Accessibility pass (axe), image lazy-loading, SEO meta tags.

## 16. Risks

| Risk                                             | Mitigation                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| fakestoreapi.com is slow or down during review   | Cache + stale-on-error; `PRODUCT_SOURCE=fixture` as a documented fallback                       |
| Docker build slow on reviewer machine            | Small alpine images, layer caching, `npm ci`                                                    |
| Over-engineering for a PoC                       | Ports only where the brief says things will change (source, mailer, cache, repos), nowhere else |
| AI-generated code drifting from the architecture | `CLAUDE.md` rules, phase-by-phase review, tests per phase                                       |

## 17. Submission checklist

- [ ] Push `main` with the initial skeleton, then do the work on `feature/catalogue-poc` and open a PR into `main` (leave it open)
- [ ] PR description: summary, architecture, how to run, AC → test mapping, assumptions, cuts, time spent
- [ ] README, DECISIONS.md, AI_USAGE.md, CLAUDE.md, docs/PLAN.md all present
- [ ] No `.env` committed; `.env.example` present
- [ ] Fresh clone → running in under 10 minutes, checked
