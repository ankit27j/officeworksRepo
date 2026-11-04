# AI usage

## Tools and models

- Claude Code (VS Code extension), model Claude Opus 5.5: planning, scaffolding, code and tests, docs.

## Agent instruction files

- [CLAUDE.md](CLAUDE.md): architecture rules, working agreements, commands. Written in Phase 0 so later AI-generated code follows the same boundaries.

## Plan / spec

- [docs/PLAN.md](docs/PLAN.md): written with the AI before any code, reviewed and approved, then built phase by phase with a review after each phase.

## Key prompts (the five that shaped the solution)

Quoted from my messages, with typos tidied.

1. **Plan first, no code.** I pasted the brief and asked:

   > "For frontend we'd use React + TypeScript and Ant Design … if a component is needed multiple times keep it global … theming must be global, no inline styling, so we can switch dark/light … MobX for state, hooks where needed, loosely coupled, and no direct API calls: there must be a layer for that … for the backend, scalability is a big factor and it must be generic … design a plan, in how many phases, no coding for now."

   This produced [docs/PLAN.md](docs/PLAN.md), which I reviewed before any code was written. It's why the layers, theming and ports exist.

2. **Backend corrected against the brief.**

   > "Okay go, and you can use Node.js as mentioned, don't use FastAPI; choose the database as per your understanding."

   I had asked for FastAPI. The AI pointed out the brief only allows Node.js or Laravel, so it became NestJS, keeping the dependency-injection design I wanted.

3. **Keep the site up if the DB fails.**

   > "And yes, do that now in case the DB is down."

   The AI had flagged that the home page returned a 500 without a database. This led to the best-rated fallback, which a live test then showed was 5.5s slow, so a 1.5s cap was added (see mistakes below).

4. **Documentation that stays true.**

   > "Keep maintaining the doc file for frontend and backend so anyone can understand what was done on the UI and backend."

   This produced [docs/FRONTEND.md](docs/FRONTEND.md) and [docs/BACKEND.md](docs/BACKEND.md), plus a CLAUDE.md rule that every change updates them in the same step.

5. **Challenge the scope against the brief.**

   > "Is there any way we don't have to use the DB and still make this work, since the task never mentions a DB?"

   Followed by:

   > "localhost:8025 is still not working … did we miss anything that was asked? Cross-check again and fix it."

   This led to:
   - The database became optional: `STORAGE=memory` by default, Postgres for Docker.
   - A built-in dev inbox, so the "sales inbox receives an email" criterion can be seen without Docker.
   - `npm run dev` as a one-command start.
   - A line-by-line cross-check of the brief, which found this section and the time log incomplete.

### Other moments that shaped the solution

- **Probing the real API before writing code.** `GET /products/999` on Fake Store returns 200 with an empty body, so the adapter loads the list and looks products up itself.
- **Real-browser checks where jsdom can't see.** Headless Edge, driven over the DevTools Protocol, caught a layout bug no test could. It later ran the full journey: home → category → search → product → enquiry → the email in the inbox.
- **Checking the Docker setup without Docker.** Each piece was checked separately: a fresh-clone install, the production-only install, the runtime image layout and the health check. The full `docker compose up` is marked as not yet run.
- **Rate limit behind a proxy.** The AI noticed that behind nginx every customer would share one IP. The fix (`TRUST_PROXY_HOPS`) came with a test that was confirmed to fail with the fix turned off.

## Where the AI got things wrong and how I caught it

- **Outdated dependency with a known vulnerability (Phase 0).** The AI scaffolded the contracts package on zod 3. `npm audit --omit=dev` flagged a high-severity advisory (zod < 4.6.6, memory exhaustion while validating oversized collections). zod is the validation layer for every API request, so I had it upgraded to zod 4 and the schemas moved to the v4 API (`error` instead of `required_error`, `z.email()`, `z.url()`, `z.enum()`). The tests confirmed the behaviour didn't change, and the production audit is now clean. The lesson: run `npm audit` as part of the check after each phase, not just at the end.
- **A misleading log message (Phase 1).** All tests passed, but the test output showed `Featured home picks not in product source: s2` for a product that _did_ exist. The AI's code logged "missing" picks after cutting the list to 5, so trimmed picks were reported as missing, which would send an operator chasing a problem that isn't there. Fixed by checking before trimming and rewording the message. The lesson: read the test output, not just the pass count.
- **A lint autofix that would have broken dependency injection (Phase 1).** `@typescript-eslint/consistent-type-imports` flagged every injected class (`ProductSource`, `CatalogService`, …) as "type-only". Applying `--fix` would have turned them into `import type`, erasing them at runtime, and Nest's constructor injection would have quietly broken. Instead of auto-fixing, the ESLint parser was told the API uses decorator metadata. This is now covered by a comment in `eslint.config.mjs`.
- **Fighting npm instead of stepping back (Phase 1).** To fix two transitive advisories, the AI hand-edited `package-lock.json`. That left npm's tree inconsistent and several installs failed. The fix was a clean reinstall with explicit, scoped `overrides`. Checking the advisory itself then showed the deepmerge-ts override (7.1.5 → 7.1.6) **didn't fix anything**: the advisory covers everything below 8.0.0. That override was removed and the issue recorded as an accepted, CLI-only risk in DECISIONS.md. The lessons: don't hand-edit lockfiles, and read the advisory's affected version range before choosing a fix.
- **A fallback that was correct but slow (Phase 2).** The DB-down fallback passed every test, but in a live run the server log timestamps showed each home page request took about 5.5s, because Prisma waited for its connection timeout before failing. Functionally a fallback, but a 5-second home page isn't one. Fixed with a 1.5s timeout on loading picks (checked live: 1.5s), plus a fake-timer test. The lesson: unit tests with in-memory fakes can't show real I/O latency, so smoke-test failure modes against real dependencies.
- **A test that asserted the wrong thing (Phase 2).** The env-defaults test expected `SMTP_USER: undefined` to be present as a key; zod 4 leaves unset optional keys out. The behaviour was right and the test was wrong, so the test was changed to assert the behaviour (`env.SMTP_USER` is undefined), not the object's shape.
- **A MobX reactivity bug that would have shipped a blank site (Phase 3).** Pages are `observer`s but only passed the store's resource object to `PageState`, a plain component, without reading `status` themselves. MobX never registered the dependency, so pages sat on the loading skeleton forever even though the store had the data. The acceptance tests caught it. Instrumenting the store state showed "success" while the DOM showed "loading". Fix: hooks return a plain **snapshot**, read inside the observer render, so components below stay MobX-free. This is now a rule in CLAUDE.md. The lesson: page-level tests through the real stores catch integration bugs that unit tests of each piece can't.
- **Broken retry helpers (Phase 3).** The first `useCategories`/`useSearch` retries passed `loadCategories()` (which returns `Promise<void>`) into `load()`, so a retry would have stored `undefined` as the data. Caught on read-back before running anything. Fixed with proper `retry*` store methods.
- **Test-environment gaps mistaken for app bugs (Phase 3).** Every navigation in the tests silently failed. Rather than patching the tests, the AI isolated it: `router.navigate()` rejected with "Expected signal to be an instance of AbortSignal", a known incompatibility between jsdom's `AbortSignal` and Node's built-in `Request`. That's fixed with a narrow, commented shim in the test setup only, alongside stubs for `ResizeObserver` and `scrollTo`, which jsdom also lacks.
- **Testing the wrong moment (Phase 3).** Acceptance tests first read `router.state.location` right after a click, but React Router 7 commits navigation asynchronously. They now wait for the new page's heading, then check the URL.
- **A layout bug only a screenshot could show (Phase 3).** Every test passed, but headless screenshots showed the 5-star rating wrapping inside product cards and splitting the review count across lines. Fixed with a compact rating on tiles.
- **Two wrong diagnoses before the right one (Phase 4).** One validation test kept failing: an untouched Name showed no error when Email held an invalid value. The AI first blamed an AntD display glitch and added an `onFinishFailed` workaround. Instrumenting the validator then showed only `email` was validated, meaning the submit handler never ran: **the browser's built-in `type="email"` validation was blocking the submit** and would have shown a native tooltip to real users. Fix: `noValidate`, and the speculative workaround was removed. Along the way it also found that AntD skips custom validators on untouched fields unless the rule is `required`. The lessons: measure before patching, and remove code written for a wrong theory.
- **Slow tests mistaken for hanging ones (Phase 4).** All enquiry tests timed out. Instead of just raising the timeout, the AI timed each step: clicks took 6–13s, because user-event checks `pointer-events` via `getComputedStyle` on every ancestor, which is very slow against AntD's CSS in jsdom. Typing took ~0.7s per character. Fixes: turn off that CSS check, and fill fields with `paste()`. Only then was the timeout raised (to 45s), with the measurements in a comment.
- **An ambiguous button name (Phase 4).** "Found multiple buttons named Close": the dialog's ✕ and the thank-you button had the same accessible name. The test caught a real accessibility issue; the button is now "Done".
- **A health check that crashed instead of reporting (Phase 5).** The AI's first compose health check called `process.exit()` inside a `fetch` callback. Run for real, it aborted Node with a libuv assertion (exit 127) instead of exiting 0 or 1. It now sets `process.exitCode` and was re-run against healthy, unhealthy and unreachable APIs. The lesson: run one-liners that live in config files; nothing else will.
- **An over-clever shell command (Phase 5).** To apply edits, the AI chained `python3 … || node …`. On Windows, `python3` is a Store stub that waited for input, so the command hung for two minutes and changed nothing. It was replaced with a small Node script that fails loudly if any text it expects to replace isn't there.

- **Overstating what a feature shows (after Phase 5).** The AI told me `MAILER=log` prints "the full email" in the API terminal. Running it showed only the recipient and subject. The docs were corrected to say what it really prints. The lesson: describe behaviour from a run, not from memory.
- **A test that assumed Zod's error format (after Phase 5).** The new "DATABASE_URL required with postgres" test failed twice. First because Zod skips cross-field checks when another field is already invalid, then because it prints the message before the field name. Both times the app was right and the test's assumption was wrong, so the test was split and corrected, not the code.

## Time spent

> **Draft from the session log. The owner adjusts the split before submitting.** Times are wall clock for 2 November 2026 (UTC), including time the AI was working while I reviewed.

| Window         | What                                                                    | Duration  |
| -------------- | ----------------------------------------------------------------------- | --------- |
| 05:38 – 05:57  | Brief → phased plan → review                                            | 0:19      |
| 05:57 – 06:49  | Phase 0: monorepo, contracts, CLAUDE.md, tooling                        | 0:52      |
| 06:49 – 07:53  | Phase 1: catalogue API (product source, picks, search)                  | 1:04      |
| 07:53 – 08:31  | Phase 2: enquiries, email, rate limit, DB-down fallback                 | 0:38      |
| 08:31 – 09:31  | Phase 3: web app (layers, theming, pages)                               | 1:00      |
| 09:31 – 11:17  | Phase 4: enquiry UI, developer guides, slow-test investigation          | 1:46      |
| 11:17 – 12:16  | Phase 5: Docker, nginx, proxy-aware rate limit, final docs              | 0:59      |
| 12:16 – ~13:50 | Running without Docker: optional database, dev inbox, brief cross-check | ~1:34     |
| **Total**      |                                                                         | **~8:10** |

| Activity  | Draft split | Notes                                                                                                             |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Planning  | ~0:30       | Plan and its review, plus re-planning (optional database)                                                         |
| Building  | ~4:30       | Code and docs, AI-driven                                                                                          |
| Testing   | ~2:10       | Test runs and live and browser checks. Slow on this Windows laptop (installs 4–10 min, web suite several minutes) |
| Reviewing | ~1:00       | Reading AI output phase by phase, the cross-check against the brief                                               |
| **Total** | **~8:10**   | Over the 2–3 hour time-box                                                                                        |

**Why it's over the time-box:**

- a review stop after every phase;
- a slow Windows machine;
- the work to run without Docker or a database.

The brief allows going over if it's reported honestly; the plan's cut order (Playwright first) was followed.
