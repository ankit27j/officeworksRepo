import { z } from 'zod';
import { CategorySchema, ProductSchema } from './product';

export const FEATURED_HOME_COUNT = 5;

export const FeaturedProductsSchema = z.array(ProductSchema);
export type FeaturedProducts = z.infer<typeof FeaturedProductsSchema>;

export const CategoryListSchema = z.array(CategorySchema);
export type CategoryList = z.infer<typeof CategoryListSchema>;

export const CategoryPageSchema = z.object({
  category: CategorySchema,
  /** Curated picks for the category, or best rated when none are curated. */
  topRated: z.array(ProductSchema),
  /** Every other product in the category (no overlap with topRated). */
  others: z.array(ProductSchema),
});
export type CategoryPage = z.infer<typeof CategoryPageSchema>;
