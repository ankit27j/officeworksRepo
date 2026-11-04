import type { Logger } from '@nestjs/common';
import type { Product } from '@catalogue/contracts';
import { z } from 'zod';
import { UpstreamUnavailableError } from '../../../../common/errors/app-errors';
import { slugify, titleCase } from '../../../../common/utils/text';

/** What fakestoreapi.com returns. Kept inside the adapter: nothing outside sees this shape. */
const FakeStoreProductSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().min(1),
  image: z.url(),
  rating: z.object({ rate: z.number(), count: z.number().int().nonnegative() }).optional(),
});
type FakeStoreProduct = z.infer<typeof FakeStoreProductSchema>;

export function mapFakeStoreProduct(raw: FakeStoreProduct): Product {
  return {
    id: String(raw.id),
    title: raw.title.trim(),
    description: raw.description.trim(),
    price: { amount: Math.round(raw.price * 100) / 100, currency: 'AUD' },
    imageUrl: raw.image,
    category: { slug: slugify(raw.category), name: titleCase(raw.category) },
    rating: {
      average: Math.min(5, Math.max(0, raw.rating?.rate ?? 0)),
      count: raw.rating?.count ?? 0,
    },
  };
}

/** Maps the product list, skipping (and logging) bad items so one bad record can't take the catalogue down. */
export function mapFakeStoreProducts(body: unknown, logger: Pick<Logger, 'warn'>): Product[] {
  if (!Array.isArray(body)) {
    throw new UpstreamUnavailableError({ cause: new Error('Fake Store returned a non-array product list') });
  }

  const products: Product[] = [];
  for (const item of body) {
    const parsed = FakeStoreProductSchema.safeParse(item);
    if (parsed.success) {
      products.push(mapFakeStoreProduct(parsed.data));
    } else {
      logger.warn(`Skipping invalid Fake Store product: ${z.prettifyError(parsed.error)}`);
    }
  }
  return products;
}
