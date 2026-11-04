# Product Catalogue — Proof of Concept

A product catalogue where customers browse featured products and categories, search, view product details and send an enquiry, which arrives as an email in the sales inbox.

> **Status:** complete PoC. All five acceptance criteria work end to end (Home, Category, Search, Product, Enquiry). The phases are in [docs/PLAN.md](docs/PLAN.md).

## Stack and why

| Layer   | Choice                                      | Why                                                                                                                      |
| ------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Client  | React + TypeScript (Vite), Ant Design, MobX | Allowed by the brief; Ant Design's theme system makes the coming rebrand and light/dark mode a one-file change           |
| Backend | Node.js + TypeScript (NestJS)               | Allowed by the brief; dependency injection lets the product source, email provider and storage be swapped through config |
| Storage | In memory by default; PostgreSQL optional   | The brief needs no database, so none is required to run it. Postgres (Prisma) keeps leads durable and maps to AWS RDS    |
| Email   | SMTP: Mailpit locally                       | Free, needs no account, and lets the reviewer see the sales inbox                                                        |
| Infra   | Docker Compose, nginx (optional)            | One command; every piece maps to an AWS service (see [DECISIONS.md](DECISIONS.md#how-the-design-supports-growth))        |

The client only ever calls our API (`/api/v1`). The API talks to Fake Store, storage and email through swappable adapters.

## Run it

There are two ways. Both show the same app.

### A. Node.js only: no database, no Docker

Needs Node.js 20.19+ or 22.12+ and npm 10+.

```bash
npm install
npm run dev
```

`npm run dev` starts three things in one terminal, with labelled output (Ctrl+C stops them all):

| URL                   | What                                            |
| --------------------- | ----------------------------------------------- |
| http://localhost:5173 | **The web app**                                 |
| http://localhost:8025 | **The sales inbox**: enquiry emails arrive here |
| http://localhost:3000 | The API (`/health`, `/api/v1/...`)              |

No `.env` file is needed. To change a setting, `cp .env.example .env` (PowerShell: `copy .env.example .env`) and edit it.

- **Storage:** `STORAGE=memory` (the default). The chosen "top rated" products come from [featured-picks.ts](apps/api/src/modules/catalog/featured-picks.ts), and enquiries are kept in memory until the API restarts.
- **Email:** the API sends real SMTP to a small built-in dev inbox ([dev-inbox.mjs](apps/api/dev/dev-inbox.mjs)), which stands in for Mailpit on the same ports. If Mailpit is already running, use it instead; the dev inbox then reports that the port is taken and the other services carry on.
- **Port 3000 already in use?** Set `API_PORT=3001` in `.env`. The web app's proxy follows it automatically.
- Each piece can also run alone: `npm run dev:inbox`, `npm run dev:api`, `npm run dev:web`.

### B. Docker: the full stack in one command

Needs Docker Desktop, or another Docker engine with Compose v2 (e.g. Rancher Desktop, Podman Desktop).

```bash
docker compose up --build
```

No `.env` file is needed. The first build downloads images and dependencies and takes a few minutes.

| URL                          | What                                                  |
| ---------------------------- | ----------------------------------------------------- |
| http://localhost:8080        | **The web app**                                       |
| http://localhost:8025        | **Mailpit, the "sales inbox"**: enquiries arrive here |
| http://localhost:8080/health | API health (storage, DB status, product source)       |

This runs with `STORAGE=postgres`, so enquiries survive restarts. Services start in this order:

1. `db` (Postgres) and `mailpit`.
2. `migrate`: a one-shot job that applies migrations and seeds the picks, then exits.
3. `api`: NestJS, reachable only inside Docker.
4. `web`: nginx, which serves the React build and proxies `/api` to the API.

Stop with `Ctrl+C`; `docker compose down -v` also deletes the database volume.

### Try the whole journey

Home → a category → search for "jacket" → open a product → **Enquire** → submit → "Thank you". Then open the inbox at http://localhost:8025.

### Postgres without Docker for the apps (optional)

With `STORAGE=postgres` in `.env`: `npm run infra:up` (Postgres + Mailpit in Docker), `npm run db:migrate`, `npm run db:seed`, then `npm run dev` as above (the dev inbox steps aside because Mailpit holds its ports).

## Configuration

Everything is in [`.env.example`](.env.example) with comments. The API validates it at startup and refuses to start with a clear message if something is wrong. The settings you're most likely to change:

| Variable                                   | Default                  | Meaning                                                               |
| ------------------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| `STORAGE`                                  | `memory`                 | `postgres` = durable storage (needs `DATABASE_URL`; Docker uses this) |
| `PRODUCT_SOURCE`                           | `fakestore`              | `fixture` = bundled offline catalogue (no internet needed)            |
| `MAILER`                                   | `smtp`                   | `log` = print emails to the API log instead of sending                |
| `SALES_INBOX_EMAIL`                        | `sales@catalogue.local`  | Where enquiries are emailed                                           |
| `ENQUIRY_RATE_LIMIT_PER_MIN`               | `5`                      | Enquiries per minute per customer IP                                  |
| `API_PORT`                                 | `3000`                   | API port for `npm run dev:api` (the web dev proxy follows it)         |
| `WEB_PORT` / `MAILPIT_UI_PORT` / `DB_PORT` | `8080` / `8025` / `5432` | Host ports used by Docker Compose                                     |

**To change the chosen products:** edit [featured-picks.ts](apps/api/src/modules/catalog/featured-picks.ts).

- **Memory storage:** restart the API.
- **Postgres:** run `npm run db:seed`, or `docker compose up --build`.

## API

All endpoints are under `/api/v1`. The request and response types are in [packages/contracts](packages/contracts/src). Errors always look like `{ "error": { "code", "message", "details?" } }`.

| Method | Path                    | Returns                                                                                              |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| GET    | `/catalog/featured`     | The 5 chosen "top rated" products                                                                    |
| GET    | `/categories`           | `[{ slug, name }]`                                                                                   |
| GET    | `/categories/:slug`     | `{ category, topRated[], others[] }`                                                                 |
| GET    | `/products?search=term` | Products whose title, description or category contains the term                                      |
| GET    | `/products/:id`         | One product                                                                                          |
| POST   | `/enquiries`            | `201 { id, status: "received" }`. Stores the enquiry and emails the sales inbox. 5 per minute per IP |
| GET    | `/health` (no prefix)   | `{ status, storage, db, productSource }`. `db` is `disabled` in memory mode; 503 if Postgres is down |

**Try an enquiry from the command line**, then check the inbox. The port is 3000 for option A and 8080 for option B.

```bash
curl -X POST http://localhost:3000/api/v1/enquiries -H "content-type: application/json" \
  -d '{"productId":"3","name":"Jane Citizen","email":"jane@example.com","message":"Is this available in blue?"}'
```

The enquiry is stored **before** the email is sent. If email delivery fails, the customer still gets `201` and the enquiry is kept with status `EMAIL_FAILED` for follow-up.

## Scripts

| Command                                     | What it does                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run lint`                              | ESLint (including the architecture rules) + stylelint (no literal colours) |
| `npm run typecheck`                         | TypeScript in every workspace                                              |
| `npm test`                                  | Tests in every workspace (contracts, API, web)                             |
| `npm run build`                             | Build every workspace                                                      |
| `npm run dev`                               | Dev inbox + API (watch mode) + web (Vite) together, no Docker or database  |
| `npm run dev:inbox` / `dev:api` / `dev:web` | Each of those on its own                                                   |
| `npm run infra:up` / `infra:down`           | Start or stop Postgres + Mailpit in Docker (only for `STORAGE=postgres`)   |
| `npm run db:migrate` / `db:seed`            | Apply migrations / reseed featured picks (only for `STORAGE=postgres`)     |

## Troubleshooting

| Problem                                              | Fix                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `EADDRINUSE` / `port is already allocated`           | Something else uses that port. Option A: `API_PORT=3001` in `.env`. Docker: e.g. `WEB_PORT=8081 docker compose up` |
| Products don't load; API log shows Fake Store errors | No internet or Fake Store is down: set `PRODUCT_SOURCE=fixture` to use the offline catalogue                       |
| No email arrives                                     | Is the inbox running (`npm run dev` starts it)? Failed sends still show "Thank you" and are kept as `EMAIL_FAILED` |
| `Invalid environment configuration … DATABASE_URL`   | `STORAGE=postgres` needs `DATABASE_URL`, or switch back to `STORAGE=memory`                                        |
| Docker: `migrate` exits with an error                | Usually an old, incompatible DB volume: `docker compose down -v`, then up again                                    |
| "Too many enquiries"                                 | The rate limit (5 a minute per IP). Wait a minute or raise `ENQUIRY_RATE_LIMIT_PER_MIN`                            |

## Repository layout

```
apps/api            NestJS API
apps/web            React client (+ nginx.conf for Docker)
packages/contracts  Shared Zod schemas + types (API contract)
docs/               Plan, frontend guide, backend guide, PR description
Dockerfile          One file, targets: api, migrate, web
```

## Developer guides

- **[docs/FRONTEND.md](docs/FRONTEND.md)**: how the web app works: layers, state, theming, components, enquiry flow, how-tos, testing
- **[docs/BACKEND.md](docs/BACKEND.md)**: how the API works: ports and adapters, storage modes, request flows, resilience, how-tos, configuration, Docker, testing

## More

- [DECISIONS.md](DECISIONS.md): decisions, assumptions, cuts, growth path, next steps
- [AI_USAGE.md](AI_USAGE.md): how AI tools were used, and where they went wrong
- [CLAUDE.md](CLAUDE.md): instructions given to the coding agent
