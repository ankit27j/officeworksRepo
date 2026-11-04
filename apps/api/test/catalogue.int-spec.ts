import {
  ApiErrorBodySchema,
  CategoryListSchema,
  CategoryPageSchema,
  FeaturedProductsSchema,
  ProductSchema,
  SearchResultsSchema,
} from '@catalogue/contracts';
import request from 'supertest';
import { createTestApp, type TestApp } from './utils/create-test-app';

describe('Catalogue API (integration)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  const api = () => request(testApp.app.getHttpServer());

  const expectError = (body: unknown, code: string) => {
    const parsed = ApiErrorBodySchema.parse(body);
    expect(parsed.error.code).toBe(code);
    return parsed;
  };

  describe('GET /api/v1/catalog/featured (Home)', () => {
    it('returns 5 contract-valid products: chosen ones in order, missing pick topped up', async () => {
      const res = await api().get('/api/v1/catalog/featured').expect(200);
      const featured = FeaturedProductsSchema.parse(res.body);
      // '999' doesn't exist, so it's replaced by the best rated remaining product ('12').
      expect(featured.map((p) => p.id)).toEqual(['3', '5', '11', '18', '12']);
    });

    it('still returns 5 best rated products when the DB is down', async () => {
      const spy = jest
        .spyOn(testApp.featured, 'findHomeProductIds')
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

      const res = await api().get('/api/v1/catalog/featured').expect(200);
      expect(FeaturedProductsSchema.parse(res.body).map((p) => p.id)).toEqual(['12', '11', '3', '18', '5']);
      spy.mockRestore();
    });
  });

  describe('GET /api/v1/categories', () => {
    it('lists categories with slugs', async () => {
      const res = await api().get('/api/v1/categories').expect(200);
      expect(CategoryListSchema.parse(res.body)).toEqual([
        { slug: 'electronics', name: 'Electronics' },
        { slug: 'jewelery', name: 'Jewelery' },
        { slug: 'mens-clothing', name: "Men's Clothing" },
        { slug: 'womens-clothing', name: "Women's Clothing" },
      ]);
    });
  });

  describe('GET /api/v1/categories/:slug (Category)', () => {
    it('returns chosen top rated products plus the rest of the category', async () => {
      const res = await api().get('/api/v1/categories/electronics').expect(200);
      const page = CategoryPageSchema.parse(res.body);
      expect(page.topRated.map((p) => p.id)).toEqual(['12']);
      expect(page.others.map((p) => p.id)).toEqual(['14', '11']);
      expect([...page.topRated, ...page.others].every((p) => p.category.slug === 'electronics')).toBe(true);
    });

    it('falls back to best rated for a category with no picks', async () => {
      const res = await api().get('/api/v1/categories/mens-clothing').expect(200);
      expect(CategoryPageSchema.parse(res.body).topRated.map((p) => p.id)).toEqual(['3', '1', '4']);
    });

    it('404s for an unknown category', async () => {
      const res = await api().get('/api/v1/categories/hats').expect(404);
      expectError(res.body, 'NOT_FOUND');
    });

    it('400s for a malformed slug', async () => {
      const res = await api().get('/api/v1/categories/BAD_SLUG').expect(400);
      expectError(res.body, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/products?search= (Search)', () => {
    it('returns only products containing the term, case-insensitively', async () => {
      const res = await api().get('/api/v1/products').query({ search: 'ssd' }).expect(200);
      expect(SearchResultsSchema.parse(res.body).map((p) => p.id)).toEqual(['11']);
    });

    it('matches description and category text too', async () => {
      const res = await api().get('/api/v1/products').query({ search: "women's" }).expect(200);
      const ids = SearchResultsSchema.parse(res.body).map((p) => p.id);
      expect(ids).toEqual(expect.arrayContaining(['5', '18']));
    });

    it('returns an empty list when nothing matches', async () => {
      const res = await api().get('/api/v1/products').query({ search: 'unicorn' }).expect(200);
      expect(res.body).toEqual([]);
    });

    it.each([
      ['missing', {}],
      ['blank', { search: '   ' }],
      ['too long', { search: 'a'.repeat(101) }],
    ])('400s for a %s term', async (_label, query) => {
      const res = await api().get('/api/v1/products').query(query).expect(400);
      const body = expectError(res.body, 'VALIDATION_ERROR');
      expect(body.error.details?.[0]?.path).toBe('search');
    });
  });

  describe('GET /api/v1/products/:id (Product)', () => {
    it('returns the product details', async () => {
      const res = await api().get('/api/v1/products/3').expect(200);
      expect(ProductSchema.parse(res.body).title).toBe('Mens Cotton Jacket');
    });

    it('404s for an unknown product', async () => {
      const res = await api().get('/api/v1/products/999').expect(404);
      expectError(res.body, 'NOT_FOUND');
    });
  });

  describe('cross-cutting', () => {
    it('returns the contract error shape for unknown routes', async () => {
      const res = await api().get('/api/v1/nope').expect(404);
      expectError(res.body, 'NOT_FOUND');
    });

    it('sets security headers', async () => {
      const res = await api().get('/api/v1/categories').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('reports health outside the API prefix', async () => {
      testApp.db.healthy = true;
      const ok = await api().get('/health').expect(200);
      expect(ok.body).toEqual({ status: 'ok', storage: 'postgres', db: 'up', productSource: 'fixture' });

      testApp.db.healthy = false;
      const degraded = await api().get('/health').expect(503);
      expect(degraded.body.db).toBe('down');
      testApp.db.healthy = true;
    });
  });
});
