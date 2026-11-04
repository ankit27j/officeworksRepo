/**
 * The entrepreneur's chosen "top rated" products (Fake Store ids), in display order.
 * Stand-in for an admin screen. Used directly with `STORAGE=memory` (restart the API after editing),
 * and written to Postgres by `prisma/seed.ts` with `STORAGE=postgres` (run `npm run db:seed`).
 * Ids the active product source doesn't have are skipped at read time (see CatalogService).
 */
export const HOME_PICKS: readonly string[] = ['3', '5', '11', '18', '1'];

/** Categories without an entry fall back to best rated (see CatalogService). */
export const CATEGORY_PICKS: Readonly<Record<string, readonly string[]>> = {
  electronics: ['12', '11'],
  jewelery: ['5', '6'],
};
