import { MemoryCache } from '../../../../common/cache/memory-cache';
import { UpstreamUnavailableError } from '../../../../common/errors/app-errors';
import type { HttpClient } from '../../../../common/http/http-client';
import { FakeStoreProductSource } from './fakestore.product-source';

const upstream = [
  {
    id: 1,
    title: 'Backpack',
    price: 109.95,
    description: 'Fits a laptop',
    category: "men's clothing",
    image: 'https://fakestoreapi.com/img/1.png',
    rating: { rate: 3.9, count: 120 },
  },
  {
    id: 9,
    title: 'Hard Drive',
    price: 64,
    description: 'USB 3.0',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/9.png',
    rating: { rate: 3.3, count: 203 },
  },
];

describe('FakeStoreProductSource', () => {
  let now: number;
  let getJson: jest.Mock;
  let source: FakeStoreProductSource;

  beforeEach(() => {
    now = 0;
    getJson = jest.fn().mockResolvedValue(upstream);
    source = new FakeStoreProductSource({ getJson } as unknown as HttpClient, new MemoryCache(() => now), {
      baseUrl: 'https://fakestoreapi.com/',
      ttlSeconds: 60,
    });
  });

  it('loads the catalogue from /products and answers queries from it', async () => {
    expect((await source.getProduct('9'))?.title).toBe('Hard Drive');
    expect(await source.getProduct('999')).toBeNull();
    expect((await source.listProducts({ categorySlug: 'electronics' })).map((p) => p.id)).toEqual(['9']);
    expect((await source.listCategories()).map((c) => c.slug)).toEqual(['electronics', 'mens-clothing']);
    expect((await source.getProductsByIds(['9', 'missing', '1'])).map((p) => p.id)).toEqual(['9', '1']);

    expect(getJson).toHaveBeenCalledTimes(1);
    expect(getJson).toHaveBeenCalledWith('https://fakestoreapi.com/products', expect.any(Object));
  });

  it('makes a single upstream call for concurrent requests', async () => {
    await Promise.all([source.listProducts(), source.searchProducts('drive'), source.getProduct('1')]);
    expect(getJson).toHaveBeenCalledTimes(1);
  });

  it('refreshes after the TTL expires', async () => {
    await source.listProducts();
    now += 61_000;
    await source.listProducts();
    expect(getJson).toHaveBeenCalledTimes(2);
  });

  it('serves the last good catalogue when a refresh fails', async () => {
    await source.listProducts();
    now += 61_000;
    getJson.mockRejectedValue(new UpstreamUnavailableError());

    expect(await source.listProducts()).toHaveLength(2);
  });

  it('fails with UpstreamUnavailableError when there is no catalogue yet', async () => {
    getJson.mockRejectedValue(new UpstreamUnavailableError());
    await expect(source.listProducts()).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});
