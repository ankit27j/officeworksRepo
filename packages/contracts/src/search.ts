import { z } from 'zod';
import { ProductSchema } from './product';

export const SEARCH_TERM_MAX_LENGTH = 100;

export const SearchQuerySchema = z.object({
  search: z
    .string({ error: 'Enter a search term' })
    .trim()
    .min(1, 'Enter a search term')
    .max(SEARCH_TERM_MAX_LENGTH, `Search term must be ${SEARCH_TERM_MAX_LENGTH} characters or fewer`),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultsSchema = z.array(ProductSchema);
export type SearchResults = z.infer<typeof SearchResultsSchema>;
