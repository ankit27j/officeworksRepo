# CLAUDE.md — agent instructions for this repo

Product catalogue PoC. **Read `docs/PLAN.md` before changing anything.** It is the spec. Record any change from it in `DECISIONS.md`.

## Stack (fixed by the brief, do not change)

- Web: React 19 + TypeScript + Vite, Ant Design 6, MobX 6, React Router 7.
- API: **NestJS (Node.js + TypeScript)**. Not Python or FastAPI; the brief allows only Node.js or Laravel.
- Storage: `STORAGE=memory` (default, no database) or `postgres` (Prisma; Docker uses it). Email: nodemailer → Mailpit locally.
- Shared contract: `packages/contracts` (Zod schemas + types). Both apps import from `@catalogue/contracts`.

## Architecture rules (non-negotiable)

1. The web app **never** calls fakestoreapi.com or any third party. It only calls `/api/v1`.
2. The API returns contract types, never upstream shapes. Map upstream data inside the adapter.
3. API services depend on **ports (interfaces)**, not adapters. Adapters are chosen in the module from env config.
   Ports: `ProductSource`, `FeaturedRepository`, `EnquiryRepository`, `Mailer`, `CacheStore`.
   Every repository port has an in-memory **and** a Prisma adapter, so the API always runs without a database.
   Don't add ports for things the brief doesn't expect to change.
4. Controllers do HTTP only (parse, validate, map). Business rules live in services.
5. Web data flow: `httpClient → services → MobX stores → hooks → pages → components (props only)`.
   Components, pages and hooks must not import `axios` or `src/api/**` (ESLint enforces this).
   **Data hooks return plain snapshots** (`snapshot(resource)`), never live MobX objects. Pages that call them
   must be `observer`. Components below receive plain props and stay MobX-free. Passing a live resource to a
   non-observer component silently stops re-renders.
6. **No inline styles** (`style=` is a lint error). Colours, fonts and radius come from `src/theme/tokens.ts`
   through AntD `ConfigProvider` (with `cssVar`). Custom CSS goes in CSS Modules using `var(--ant-…)`; stylelint
   blocks hex, named and rgb()/hsl() colours. Put CSS Module classes on **our own elements**; style AntD
   components through tokens and props, not by overriding their internal classes.
7. Reusable UI lives in `src/components/**`. Before making a new component, check whether an existing one fits.
8. Validation uses the shared Zod schemas on both sides. Do not duplicate rules.
9. Errors: the API always returns `{ error: { code, message, details? } }` (see `contracts/src/error.ts`). Never leak stack traces.
10. No secrets in code. Read config only through the validated config module. Add new variables to `.env.example`.

## Working agreements

- Every behaviour change comes with tests: unit tests for services and stores, integration or page tests for endpoints and pages.
- **Keep the docs current in the same change:** [`docs/FRONTEND.md`](docs/FRONTEND.md) for anything in `apps/web`, [`docs/BACKEND.md`](docs/BACKEND.md) for anything in `apps/api` or `packages/contracts` (new endpoint, component, store, env var, adapter, gotcha). Also update `DECISIONS.md` (why) and `AI_USAGE.md` (notable AI mistakes) at the end of each phase.
- Before saying a task is done, run `npm run lint`, `npm run typecheck` and `npm test` and report the real results.
- Keep changes inside the current phase in `docs/PLAN.md`. Don't add features that aren't in the plan.
- Match the existing style: Prettier config, `import type` for types, and comments only where the reason isn't obvious.
- Don't commit or push. The owner commits manually.

## Commands

- `docker compose up --build`: the whole stack (web on http://localhost:8080, Mailpit on :8025)
- `npm run dev`: dev inbox (:8025) + API (:3000) + web (:5173), no Docker or database needed
- `npm install`: install all workspaces
- `npm run build`: build all workspaces (contracts first)
- `npm run lint` / `npm run typecheck` / `npm test`
- `npm run infra:up`: start Postgres + Mailpit in Docker (inbox at http://localhost:8025); only for `STORAGE=postgres` or to see emails
- `npm run dev:api` / `npm run dev:web`: API on :3000, web on :5173 (proxies `/api` to the API)
