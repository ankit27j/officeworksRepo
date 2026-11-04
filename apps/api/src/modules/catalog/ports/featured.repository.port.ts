/** Port for the business's curated "top rated" picks. Returns product ids in display order. */
export abstract class FeaturedRepository {
  abstract findHomeProductIds(): Promise<string[]>;
  abstract findCategoryProductIds(categorySlug: string): Promise<string[]>;
}
