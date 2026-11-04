# Frontend guide (`apps/web`)

How the web app is built, how data gets from the API onto the screen, and how to make common changes. Read this before your first UI change. It's kept up to date with every phase.

> Stack: **React 19** + **TypeScript**, **Vite 7**, **Ant Design 6** (UI kit + theming), **MobX 6** (state), **React Router 7**, **axios**, **Zod 4** (shared validation). Tests: **Vitest** + **Testing Library** + **MSW**.

---

## 1. What the app does

| Route             | Page                                                          | Acceptance criterion |
| ----------------- | ------------------------------------------------------------- | -------------------- |
| `/`               | **Home**: the 5 products the business chose as "top rated"    | Home                 |
| `/category/:slug` | **Category**: "Top rated" + "More in {category}"              | Category             |
| `/search?q=term`  | **Search results**: only products containing the term         | Search               |
| `/product/:id`    | **Product details** + **Enquire** button → form → "Thank you" | Product, Enquiry     |
| anything else     | Not found                                                     | —                    |

Every page has a header with the brand, a **search bar** (searches on the button or Enter, not while typing), **category links** (the active one highlighted) and a **light/dark toggle**.

---

## 2. The layers (and the one rule that keeps them apart)

```
  components/     presentational, props only: no stores, no API, no MobX
       ▲  plain props
  pages/          observer components: read hooks, compose components
       ▲  plain snapshots
  hooks/          useFeaturedProducts, useCategoryPage, useSearch, useEnquiry…
       ▲
  stores/         MobX: CatalogStore, ProductStore, SearchStore, EnquiryStore, ThemeStore
       ▲  injected
  api/services/   CatalogService, ProductService, EnquiryService
       ▲
  api/httpClient  axios + contract validation + one ApiError type
       ▲
     /api/v1      (the backend; never fakestoreapi.com)
```

**ESLint enforces the boundaries:** components, pages and hooks cannot import `axios` or anything in `src/api/**`. Stores are the only consumers of services.

### Why each layer exists

- **`HttpClient`** ([api/httpClient.ts](../apps/web/src/api/httpClient.ts)): the only place that talks HTTP. It **checks every response against the shared Zod schema** from `@catalogue/contracts`. A mismatch becomes `INVALID_RESPONSE` instead of a confusing crash later. Every failure (network, timeout, API error, bad shape) becomes one [`ApiError`](../apps/web/src/api/ApiError.ts) with a human-readable message.
- **Services**: one method per endpoint, typed with contract types. Swapping the backend touches only this layer.
- **Stores**: hold state and decide when to fetch. They receive services through their constructor ([RootStore](../apps/web/src/stores/RootStore.ts)), so tests can pass fakes.
- **Hooks**: connect stores to React: start loading in `useEffect`, return a **plain snapshot** (see §4).
- **Pages**: `observer` components that call hooks and compose components.
- **Components**: reusable, presentational, with no knowledge of where data comes from.

---

## 3. Folder map

```
apps/web/src/
├─ main.tsx                 # creates RootStore + browser router, renders <App>
├─ app/
│  ├─ App.tsx               # providers: StoreProvider → AppThemeProvider → RouterProvider
│  ├─ routes.tsx            # route table (shared by the app and the tests)
│  └─ RootLayout.tsx        # wires stores/router into the header + <Outlet/>
├─ api/
│  ├─ httpClient.ts         # axios + contract validation + ApiError mapping
│  ├─ ApiError.ts
│  └─ services/             # catalogService, productService, enquiryService, createServices()
├─ stores/
│  ├─ utils/AsyncResource.ts   # loading/error/data helper used by every store + snapshot()
│  ├─ RootStore.ts, StoreProvider.tsx
│  └─ CatalogStore, ProductStore, SearchStore, EnquiryStore, ThemeStore
├─ hooks/                   # useStores + one hook per data need + useDocumentTitle
├─ pages/                   # HomePage, CategoryPage, SearchPage, ProductPage, NotFoundPage
├─ components/              # reusable UI (see §6)
├─ theme/                   # tokens.ts (brand), antdTheme.ts, AppThemeProvider
├─ config/                  # app.ts (name, API URL), paths.ts (every URL in one place)
├─ utils/                   # formatPrice, pluralize, zodRule
├─ styles/global.css        # resets only
└─ test/                    # MSW handlers + fixtures, renderApp(), setup
```

---

## 4. State management (MobX) in practice

### `AsyncResource<T>`: one pattern for every request

[`AsyncResource`](../apps/web/src/stores/utils/AsyncResource.ts) holds `status` (`idle | loading | success | error`), `data` and `error`, with:

- `load(fetcher)`: always fetches. "Latest wins": if a newer load starts, an older response arriving late is ignored.
- `ensureLoaded(fetcher)`: fetches only if not already loaded or in flight, e.g. when revisiting a page.

Stores are thin wrappers that create resources and pick the right service call:

```ts
// CatalogStore
loadFeatured()  { return this.featured.ensureLoaded(() => this.service.getFeatured()); }
retryFeatured() { return this.featured.load(() => this.service.getFeatured()); }
```

### ⚠️ Hooks return snapshots, not live observables

```ts
export function useFeaturedProducts() {
  const { catalog } = useStores();
  useEffect(() => {
    void catalog.loadFeatured();
  }, [catalog]);
  return { state: snapshot(catalog.featured), retry: () => void catalog.retryFeatured() };
}
```

`snapshot()` reads `status/data/error` **inside the page's observer render**, so MobX knows the page depends on them. If you passed the live `catalog.featured` object to a non-observer component (like `PageState`), MobX wouldn't track it and the page would sit on "loading" forever. This bug happened once (see AI_USAGE.md).

**Rules:**

1. Pages that use data hooks are wrapped in `observer(...)`.
2. Hooks return plain values (`snapshot(...)`).
3. Components never import from `mobx`.

---

## 5. Theming: light/dark and the coming rebrand

```
theme/tokens.ts ──► antdTheme.ts (ConfigProvider, cssVar) ──► every AntD component
       │                                   │
       │                                   └─► CSS variables: var(--ant-color-primary), var(--ant-padding-lg)…
       │                                                 │
       └──────────────── one source of truth ───────────► our CSS Modules use only these variables
```

- **[`theme/tokens.ts`](../apps/web/src/theme/tokens.ts)** is the **only** place brand colours, fonts and radius are written. The rebrand means editing this file.
- **Dark mode** = AntD's dark algorithm + a few overrides in `modeTokens.dark`. `ThemeStore` remembers the choice (localStorage) and otherwise follows the OS setting.
- **No inline styles:** `style={…}` is an ESLint error.
- **No literal colours in CSS:** stylelint blocks hex, named colours and `rgb()/hsl()`. Use `var(--ant-…)`.
- **Layout sizes** (content width, card size) are CSS variables in [`AppThemeProvider.module.css`](../apps/web/src/theme/AppThemeProvider.module.css).
- Put CSS Module classes on **our own elements**. Style AntD components through **tokens and props**, not by overriding their internal classes (that fights AntD's CSS-in-JS and breaks on upgrades).

### Change the brand colour

```ts
// theme/tokens.ts
export const brandTokens = { colorPrimary: '#e8590c' /* … */ };
```

Every button, link, highlight and focus ring updates, in both modes.

---

## 6. Reusable components

| Component                         | Purpose                                                                                     | Used by                |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| `layout/AppLayout`                | Page frame: header, centred content, footer (landmark elements)                             | RootLayout             |
| `layout/AppHeader`                | Brand + slots for search, nav and actions                                                   | RootLayout             |
| `navigation/CategoryNav`          | Category links, active one highlighted (NavLink)                                            | RootLayout             |
| `search/SearchBar`                | Controlled input + **Search** button; disabled when blank; Enter submits                    | RootLayout             |
| `theme/ThemeToggle`               | Light/dark switch                                                                           | RootLayout             |
| `product/ProductCard`             | Product tile; the whole tile is one link                                                    | ProductGrid            |
| `product/ProductGrid`             | Responsive grid (`auto-fill`, down to 1 column)                                             | Home, Category, Search |
| `product/ProductSection`          | Titled group of products (a labelled region)                                                | Home, Category         |
| `product/ProductDetails`          | Breadcrumb, image, title, rating, price, description, actions slot                          | ProductPage            |
| `product/Price`, `product/Rating` | Formatted price; stars (full or `compact`) with an accessible label                         | cards, details         |
| `feedback/PageState`              | **Loading / error + retry / not found / empty** in one place                                | every page             |
| `feedback/NotFoundResult`         | 404 view with "Back to home"                                                                | pages, routes          |
| `enquiry/EnquiryModal`            | Dialog that shows the form, then "Thank you"                                                | ProductPage            |
| `enquiry/EnquiryForm`             | Fields validated with the **shared contract schema**, API errors mapped to fields, honeypot | EnquiryModal           |
| `enquiry/EnquiryThankYou`         | Confirmation message                                                                        | EnquiryModal           |

Before adding a component, check this table.

---

## 7. The enquiry flow

1. **ProductPage** → `Enquire` → `enquiry.reset()` then opens `EnquiryModal`. Resetting on open, not close, avoids a flash of the form while the dialog closes.
2. **EnquiryForm** validates each field with [`zodRule(FIELDS.x, { required })`](../apps/web/src/utils/zodRule.ts), the **same Zod schema the API uses**, so messages match exactly.
   - The form has `noValidate`: otherwise the browser's own validation of `type="email"` blocks submit and shows a native tooltip instead of our messages.
   - The hidden `website` field is a **honeypot** (off-screen, `aria-hidden`, not tabbable). Bots fill it; the API silently discards those.
3. Submit → `EnquiryStore.submit({ ...values, productId })` → `EnquiryService` → `POST /api/v1/enquiries`.
4. **Success** → the modal shows **"Thank you, {name}!"**. **Error** → an alert above the form (e.g. rate limited), with field errors from a 400 under the matching fields. What the user typed is kept.

---

## 8. How to…

### …add a page

1. Create `pages/MyPage.tsx` as an `observer` component.
2. Add the route in [`app/routes.tsx`](../apps/web/src/app/routes.tsx) and a builder in [`config/paths.ts`](../apps/web/src/config/paths.ts).
3. Use `PageState` for loading/error/empty, and `useDocumentTitle` for the tab title.

### …call a new API endpoint

1. Add/extend schemas in `packages/contracts` (shared with the API).
2. Add a service method: `this.http.get('/path', Schema)`.
3. Add a store (or resource) using `AsyncResource`, and a hook returning `snapshot(...)`.
4. Use the hook in a page. Add an MSW handler in [`test/handlers.ts`](../apps/web/src/test/handlers.ts) and a test.

### …change the app name or API URL

[`config/app.ts`](../apps/web/src/config/app.ts) for the name. `VITE_API_BASE_URL` in `.env` (default `/api/v1`, proxied to the API by Vite in dev and nginx in Docker).

---

## 9. Running and testing

```bash
npm run dev                     # from the repo root: dev inbox + API + web together
npm run dev:web                 # http://localhost:5173 (proxies /api → the API on API_PORT from .env, default 3000)
npm test -w @catalogue/web      # all web tests
npx vitest run src/app/enquiry.test.tsx   # one file (run inside apps/web)
npm run lint                    # ESLint (architecture rules) + stylelint (no literal colours)
npm run build -w @catalogue/web # typecheck + production build
```

**In Docker** the app is built once (`web` target of the root [`Dockerfile`](../Dockerfile)) and served by nginx at http://localhost:8080 ([`nginx.conf`](../apps/web/nginx.conf)):

- `/api/*` is proxied to the API on the same origin, exactly like the Vite dev proxy, so the app code is identical in both.
- Unknown paths return `index.html`, so deep links like `/product/3` work on refresh.
- `/assets/*` files have a content hash in their names and are cached for a year. `index.html` is never cached, so a new release shows up on the next load.
- `VITE_API_BASE_URL` is a **build-time** value (build arg, default `/api/v1`). Changing it means rebuilding the image.

| Test file                                                            | What it covers                                                                                      |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`app/acceptance.test.tsx`](../apps/web/src/app/acceptance.test.tsx) | Home, Category, Search and Product criteria, one test each; errors + retry; not found; theme toggle |
| [`app/enquiry.test.tsx`](../apps/web/src/app/enquiry.test.tsx)       | Enquiry criterion; validation; API errors; reopening; honeypot                                      |
| `api/httpClient.test.ts`                                             | Contract validation and error mapping                                                               |
| `stores/**/*.test.ts`                                                | AsyncResource (latest wins), ThemeStore (storage failures)                                          |
| `components/**/*.test.tsx`                                           | SearchBar, PageState                                                                                |

**How the app tests work:** [`renderApp(path)`](../apps/web/src/test/renderApp.tsx) renders the **whole app** with real stores, services and router. Only the network is faked, by [MSW](../apps/web/src/test/handlers.ts). Any request without a handler fails the test.

**Test-environment notes** (all in [`test/setup.ts`](../apps/web/src/test/setup.ts), test-only):

- jsdom lacks `matchMedia`, `ResizeObserver` and `scrollTo`, so they're stubbed.
- jsdom's `AbortSignal` is incompatible with Node's `Request`, which broke every React Router navigation. A narrow shim fixes it.
- user-event's `pointer-events` CSS check is turned off: with AntD's CSS it made each click take 6–13s.
- Tests fill form fields with `paste()`. Typing key-by-key re-renders the AntD form per character, which is very slow in jsdom.
- The timeout is 45s per test: the full web suite takes a few minutes on a slow machine because AntD generates CSS in jsdom.

---

## 10. Gotchas

- **Forgot `observer`?** The page won't update when data arrives.
- **Passing a store object to a component?** Pass plain values from a hook instead.
- **Need a colour?** Use `var(--ant-…)` in CSS, or a token in `tokens.ts`. Never a literal.
- **Form shows the browser's tooltip instead of our message?** The `<Form>` needs `noValidate`.
- **Required field passes when left empty?** Its `zodRule` needs `{ required: true }`.
- **API on another port?** Set `API_PORT` in the root `.env`; the dev proxy reads it ([vite.config.ts](../apps/web/vite.config.ts)). `API_PROXY_TARGET` overrides it completely.
- **Changed a `VITE_` variable and Docker didn't pick it up?** They're baked in at build time: `docker compose up --build web`.
