<!-- Draft for the PR from feature/catalogue-poc into main. Paste everything below this line into the PR.
     Links are relative to docs/, which works when viewing this file on GitHub; in the PR body, swap them
     for full links to the branch if they don't resolve. -->

# Product catalogue PoC

A product catalogue where customers browse featured products and categories, search, view details and send an enquiry, which arrives as an email in the sales inbox.

- **Client:** React + TypeScript (Vite), Ant Design, MobX
- **API:** NestJS (Node.js + TypeScript)
- **Storage:** in memory by default, so no database is needed; PostgreSQL via Prisma is optional (`STORAGE=postgres`, used by Docker)
- **Email:** SMTP; Mailpit as the local sales inbox
- **Products:** Fake Store, which the browser never calls directly; only our API does

## How to run

**Node.js only (no database, no Docker):**

```bash
npm install
npm run dev
```

- **App:** http://localhost:5173
- **Sales inbox:** http://localhost:8025. It's a small built-in dev inbox receiving real SMTP from the API.

**Or the full stack with Docker:** `docker compose up --build`. The app is at http://localhost:8080 and the sales inbox (Mailpit) at http://localhost:8025.

Offline, or Fake Store down? Set `PRODUCT_SOURCE=fixture`. Details and troubleshooting are in the [README](../README.md).

## Acceptance criteria → tests

| Criterion                                           | Web (whole app, real stores, network mocked)                | API (real Nest app over HTTP)                                                                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home:** see the 5 chosen top rated products       | `acceptance.test.tsx` › Home                                | `catalogue.int-spec.ts` › featured: chosen ones in order; still 5 when the DB is down                                                           |
| **Category:** top rated + additional products       | `acceptance.test.tsx` › Category                            | `catalogue.int-spec.ts` › category page; fallback with no picks; 404                                                                            |
| **Search:** only matching products, on button click | `acceptance.test.tsx` › Search (three tests)                | `catalogue.int-spec.ts` › search: only matches, case-insensitive; empty result                                                                  |
| **Product:** tile opens a details page              | `acceptance.test.tsx` › Product                             | `catalogue.int-spec.ts` › product details; 404                                                                                                  |
| **Enquiry:** form emails sales, shows "Thank you"   | `enquiry.test.tsx` › acceptance + five form-behaviour tests | `enquiries.int-spec.ts` (saved + emailed, email down, validation, honeypot); `rate-limit.int-spec.ts`; SMTP round trip in `smtp.mailer.spec.ts` |

`memory-storage.int-spec.ts` runs Home, Category and Enquiry through the real app with no database configured.

Totals: **149 tests** (contracts 13, API 90 + 2 for the dev inbox, web 44). Lint (including the architecture rules), typecheck and build are clean.

## Architecture in brief

- **API:** ports and adapters for the three things the brief says will change:
  - **Product source:** `ProductSource` (Fake Store, or the offline fixture).
  - **Email provider:** `Mailer` (SMTP, or log). AWS SES works through SMTP with configuration only.
  - **Storage:** `FeaturedRepository` and `EnquiryRepository`, each with an in-memory and a Prisma adapter, chosen by `STORAGE`. The brief needs no database, so none is required.
  - **Contract:** responses always use our own types, never Fake Store's shapes. Every error has one shape.
- **Web:** `HttpClient → services → MobX stores → hooks → pages → components`.
  - ESLint stops UI code from importing the API layer and forbids inline styles.
  - Every response is validated against the same Zod schemas the API uses.
- **Theming:** brand colours, fonts and radius are in one file. Dark mode is a toggle. stylelint rejects literal colours.
- **Resilience:**
  - Fake Store responses are cached; if it fails, the last good copy is served.
  - With Postgres, if the DB is down, browsing still works (best-rated fallback within 1.5s).
  - Enquiries are stored before the email is sent, so an email outage never loses a lead. In memory mode they last until the API restarts.
  - Enquiries are rate limited per customer IP, also behind the proxy, and a hidden honeypot field catches bots.
- **Containers:**
  - One Dockerfile with `api`, `migrate` and `web` targets.
  - Migrations and the seed run as a one-shot job.
  - nginx serves the app and proxies `/api` on the same origin.
  - Each piece maps to AWS: S3/CloudFront, ECS, RDS, SES.

Developer guides: [docs/FRONTEND.md](FRONTEND.md) and [docs/BACKEND.md](BACKEND.md).

## Assumptions (full list in DECISIONS.md)

- "Top rated" products are **chosen by the business** in one config file (seeded into the DB with Postgres), standing in for an admin screen. Fake Store ratings are only a fallback.
- Search is a case-insensitive substring match on title, description and category, run on the button or Enter.
- Enquiry: name, email and message are required; phone is optional. One enquiry is about one product.
- Prices are in AUD. Web only, with a responsive layout.

## Cut or simplified

- Admin UI.
- Email outbox and retry worker.
- Customer confirmation email.
- Redis.
- Pagination.
- Playwright end-to-end tests. The enquiry flow was checked in a real headless browser instead, in light and dark mode.
- Cloud deployment.

The next steps are in [DECISIONS.md](../DECISIONS.md#next-steps-with-another-day).

## Verification status

- ✅ Lint, typecheck, all tests, production builds.
- ✅ Fresh copy of the repo: `npm ci` plus build took about 6 minutes on a slow Windows laptop.
- ✅ The production API, laid out exactly as in its image, booted and served without a database.
- ✅ `npm run dev` with no database or Docker, driven in headless Edge against the live Fake Store. Every acceptance criterion passed: the 5 chosen products in order; category top rated plus more; search showing only matches, via the button; tile → details; Enquire → "Thank you"; and the email in the inbox at :8025 with the right recipient, reply-to and product.
- ✅ The compose health-check command behaves correctly against a healthy, unhealthy and unreachable API.
- ✅ The UI was checked in headless Edge against the live API, including the full enquiry flow.
- ⚠️ **`docker compose up --build` itself, and nginx, were not run on the build machine, which had no container runtime.** Each piece the images rely on was checked separately (above). The first full Docker run was on: _fill in after running it locally_.

## AI usage

Built with Claude Code from a written plan ([docs/PLAN.md](PLAN.md)) and agent rules ([CLAUDE.md](../CLAUDE.md)). The key prompts and every notable AI mistake, with how it was caught, are in [AI_USAGE.md](../AI_USAGE.md).

## Time spent

About 8 hours over one day, against a 2–3 hour time-box. The reasons:

- a review after every phase;
- a slow Windows machine;
- the work to run without Docker or a database.

The timeline is in [AI_USAGE.md](../AI_USAGE.md#time-spent). <!-- owner: confirm the split before submitting -->

| Activity  | Time      |
| --------- | --------- |
| Planning  | ~0:30     |
| Building  | ~4:30     |
| Testing   | ~2:10     |
| Reviewing | ~1:00     |
| **Total** | **~8:10** |

🤖 Generated with [Claude Code](https://claude.com/claude-code)
