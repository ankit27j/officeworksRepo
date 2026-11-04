import { UpstreamUnavailableError } from '../../../../common/errors/app-errors';
import { mapFakeStoreProducts } from './fakestore.mapper';

const raw = {
  id: 3,
  title: ' Mens Cotton Jacket ',
  price: 55.989,
  description: 'Great outerwear',
  category: "men's clothing",
  image: 'https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png',
  rating: { rate: 4.7, count: 500 },
};

describe('mapFakeStoreProducts', () => {
  const logger = { warn: jest.fn() };

  beforeEach(() => logger.warn.mockReset());

  it('maps the upstream shape to the contract Product', () => {
    expect(mapFakeStoreProducts([raw], logger)).toEqual([
      {
        id: '3',
        title: 'Mens Cotton Jacket',
        description: 'Great outerwear',
        price: { amount: 55.99, currency: 'AUD' },
        imageUrl: raw.image,
        category: { slug: 'mens-clothing', name: "Men's Clothing" },
        rating: { average: 4.7, count: 500 },
      },
    ]);
  });

  it('defaults a missing rating to zero', () => {
    const [product] = mapFakeStoreProducts([{ ...raw, rating: undefined }], logger);
    expect(product?.rating).toEqual({ average: 0, count: 0 });
  });

  it('skips and logs invalid items instead of failing the whole list', () => {
    const products = mapFakeStoreProducts([raw, { id: 'oops' }], logger);
    expect(products).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-array body', () => {
    expect(() => mapFakeStoreProducts({ message: 'nope' }, logger)).toThrow(UpstreamUnavailableError);
  });
});
