import { z } from 'zod';

/**
 * Product ids are strings so the contract does not depend on any one source's id format
 * (Fake Store uses integers; a future PIM/CMS may use UUIDs or SKUs).
 */
export const ProductIdSchema = z.string().trim().min(1).max(64);
export type ProductId = z.infer<typeof ProductIdSchema>;

/** URL-safe category key, e.g. "mens-clothing". */
export const CategorySlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid category')
  .max(64, 'Invalid category');
export type CategorySlug = z.infer<typeof CategorySlugSchema>;

export const CategorySchema = z.object({
  slug: CategorySlugSchema,
  name: z.string().min(1),
});
export type Category = z.infer<typeof CategorySchema>;

export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  // Assumption: the source has no currency, so prices are shown in AUD.
  currency: z.literal('AUD'),
});
export type Money = z.infer<typeof MoneySchema>;

export const RatingSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
});
export type Rating = z.infer<typeof RatingSchema>;

export const ProductSchema = z.object({
  id: ProductIdSchema,
  title: z.string().min(1),
  description: z.string(),
  price: MoneySchema,
  imageUrl: z.url(),
  category: CategorySchema,
  rating: RatingSchema,
});
export type Product = z.infer<typeof ProductSchema>;
