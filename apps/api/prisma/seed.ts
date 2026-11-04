import { FeaturedScope, PrismaClient, type Prisma } from '@prisma/client';
// One list of picks for both storage modes; edit it there.
import { CATEGORY_PICKS, HOME_PICKS } from '../src/modules/catalog/featured-picks';

function buildRows(): Prisma.FeaturedProductCreateManyInput[] {
  const home = HOME_PICKS.map((productId, position) => ({
    scope: FeaturedScope.HOME,
    categorySlug: null,
    productId,
    position,
  }));
  const categories = Object.entries(CATEGORY_PICKS).flatMap(([categorySlug, ids]) =>
    ids.map((productId, position) => ({ scope: FeaturedScope.CATEGORY, categorySlug, productId, position })),
  );
  return [...home, ...categories];
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const rows = buildRows();
    // The seed is the source of truth for picks, so replace rather than merge (safe to re-run).
    await prisma.$transaction([
      prisma.featuredProduct.deleteMany(),
      prisma.featuredProduct.createMany({ data: rows }),
    ]);
    process.stdout.write(`Seeded ${rows.length} featured products\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
