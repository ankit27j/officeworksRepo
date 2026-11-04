import { FEATURED_HOME_COUNT } from '@catalogue/contracts';
import { InMemoryFeaturedRepository } from './adapters/in-memory-featured.repository';
import { aProduct } from '../../../test/fakes/product.factory';
import { MemoryCache } from '../../common/cache/memory-cache';
import { NotFoundError } from '../../common/errors/app-errors';
import { FixtureProductSource } from '../products/adapters/fixture/fixture.product-source';
import { CATEGORY_TOP_RATED_FALLBACK_COUNT, CatalogService, PICKS_TIMEOUT_MS } from './catalog.service';

const products = [
  aProduct({ id: 't1', title: 'Zip Hoodie', rating: { average: 4.9, count: 10 } }, 'tops'),
  aProduct({ id: 't2', title: 'Basic Tee', rating: { average: 2.0, count: 10 } }, 'tops'),
  aProduct({ id: 't3', title: 'Crew Neck', rating: { average: 4.0, count: 10 } }, 'tops'),
  aProduct({ id: 't4', title: 'Polo', rating: { average: 3.5, count: 10 } }, 'tops'),
  aProduct({ id: 's1', title: 'Runner', rating: { average: 4.5, count: 10 } }, 'shoes'),
  aProduct({ id: 's2', title: 'Loafer', rating: { average: 1.0, count: 10 } }, 'shoes'),
  aProduct({ id: 's3', title: 'Boot', rating: { average: 3.0, count: 10 } }, 'shoes'),
];

const ids = (list: { id: string }[]) => list.map((p) => p.id);

function serviceWith(home: string[], categories: Record<string, string[]> = {}): CatalogService {
  return new CatalogService(
    new FixtureProductSource(new MemoryCache(), products),
    new InMemoryFeaturedRepository(home, categories),
  );
}

describe('CatalogService', () => {
  describe('getFeatured', () => {
    it('returns the chosen products in the chosen order', async () => {
      const featured = await serviceWith(['s3', 't2', 's2', 't4', 't1']).getFeatured();
      expect(ids(featured)).toEqual(['s3', 't2', 's2', 't4', 't1']);
    });

    it(`returns at most ${FEATURED_HOME_COUNT} products`, async () => {
      const featured = await serviceWith(['t1', 't2', 't3', 't4', 's1', 's2']).getFeatured();
      expect(featured).toHaveLength(FEATURED_HOME_COUNT);
    });

    it('skips picks missing from the source and tops up with best rated products', async () => {
      const featured = await serviceWith(['s2', 'gone', 't2']).getFeatured();
      // chosen first (in order), then best rated not already shown: t1 (4.9), s1 (4.5), t3 (4.0)
      expect(ids(featured)).toEqual(['s2', 't2', 't1', 's1', 't3']);
    });

    it('falls back entirely to best rated when nothing is chosen', async () => {
      expect(ids(await serviceWith([]).getFeatured())).toEqual(['t1', 's1', 't3', 't4', 's3']);
    });
  });

  describe('getCategoryPage', () => {
    it('uses the chosen products for the category as top rated', async () => {
      const page = await serviceWith([], { tops: ['t2', 't4'] }).getCategoryPage('tops');
      expect(page.category).toEqual({ slug: 'tops', name: 'Tops' });
      expect(ids(page.topRated)).toEqual(['t2', 't4']);
      expect(ids(page.others)).toEqual(['t3', 't1']); // alphabetical: Crew Neck, Zip Hoodie
    });

    it(`falls back to the ${CATEGORY_TOP_RATED_FALLBACK_COUNT} best rated when nothing is chosen`, async () => {
      const page = await serviceWith([]).getCategoryPage('tops');
      expect(ids(page.topRated)).toEqual(['t1', 't3', 't4']);
      expect(ids(page.others)).toEqual(['t2']);
    });

    it('ignores picks that belong to another category', async () => {
      const page = await serviceWith([], { shoes: ['t1', 's3'] }).getCategoryPage('shoes');
      expect(ids(page.topRated)).toEqual(['s3']);
      expect(ids(page.others)).toEqual(['s2', 's1']); // Loafer, Runner
    });

    it('never repeats a top rated product in others', async () => {
      const page = await serviceWith([], { tops: ['t1'] }).getCategoryPage('tops');
      const overlap = page.others.filter((p) => ids(page.topRated).includes(p.id));
      expect(overlap).toEqual([]);
      expect(page.topRated.length + page.others.length).toBe(4);
    });

    it('throws NotFoundError for an unknown category', async () => {
      await expect(serviceWith([]).getCategoryPage('hats')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('when the picks store (DB) is down', () => {
    const brokenPicks = new InMemoryFeaturedRepository();
    const dbDown = new Error('connect ECONNREFUSED');
    jest.spyOn(brokenPicks, 'findHomeProductIds').mockRejectedValue(dbDown);
    jest.spyOn(brokenPicks, 'findCategoryProductIds').mockRejectedValue(dbDown);
    const service = new CatalogService(new FixtureProductSource(new MemoryCache(), products), brokenPicks);

    it('home falls back to best rated instead of failing', async () => {
      expect(ids(await service.getFeatured())).toEqual(['t1', 's1', 't3', 't4', 's3']);
    });

    it('does not wait longer than PICKS_TIMEOUT_MS for a hanging DB', async () => {
      jest.useFakeTimers();
      try {
        const hangingPicks = new InMemoryFeaturedRepository();
        jest.spyOn(hangingPicks, 'findHomeProductIds').mockReturnValue(new Promise(() => undefined));
        const slow = new CatalogService(new FixtureProductSource(new MemoryCache(), products), hangingPicks);

        const featured = slow.getFeatured();
        await jest.advanceTimersByTimeAsync(PICKS_TIMEOUT_MS);
        expect(ids(await featured)).toEqual(['t1', 's1', 't3', 't4', 's3']);
      } finally {
        jest.useRealTimers();
      }
    });

    it('category falls back to best rated instead of failing', async () => {
      const page = await service.getCategoryPage('tops');
      expect(ids(page.topRated)).toEqual(['t1', 't3', 't4']);
      expect(ids(page.others)).toEqual(['t2']);
    });
  });
});
