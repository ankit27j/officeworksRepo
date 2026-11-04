import { aProduct } from '../../../../test/fakes/product.factory';
import { byRatingDesc, searchProducts, uniqueCategories } from './product-query';

describe('searchProducts', () => {
  const jacket = aProduct({ id: '1', title: 'Cotton Jacket', description: 'Warm outerwear' });
  const shirt = aProduct({ id: '2', title: 'Slim Shirt', description: 'Pairs well with a JACKET' });
  const ring = aProduct({ id: '3', title: 'Gold Ring', description: 'Shiny' }, 'shoes');
  const all = [shirt, ring, jacket];

  it('matches title case-insensitively and lists title matches first', () => {
    expect(searchProducts(all, 'jacket').map((p) => p.id)).toEqual(['1', '2']);
  });

  it('matches category name', () => {
    expect(searchProducts(all, 'shoes').map((p) => p.id)).toEqual(['3']);
  });

  it('only returns products that contain the term', () => {
    expect(searchProducts(all, 'gold').map((p) => p.id)).toEqual(['3']);
    expect(searchProducts(all, 'nothing-matches')).toEqual([]);
  });

  it('returns nothing for a blank term', () => {
    expect(searchProducts(all, '   ')).toEqual([]);
  });
});

describe('byRatingDesc', () => {
  it('orders by average, then by review count', () => {
    const products = [
      aProduct({ id: 'low', rating: { average: 2, count: 999 } }),
      aProduct({ id: 'high-few', rating: { average: 4.5, count: 10 } }),
      aProduct({ id: 'high-many', rating: { average: 4.5, count: 300 } }),
    ];
    expect(products.sort(byRatingDesc).map((p) => p.id)).toEqual(['high-many', 'high-few', 'low']);
  });
});

describe('uniqueCategories', () => {
  it('de-duplicates and sorts by name', () => {
    const products = [
      aProduct({ id: '1' }, 'tops'),
      aProduct({ id: '2' }, 'shoes'),
      aProduct({ id: '3' }, 'tops'),
    ];
    expect(uniqueCategories(products).map((c) => c.slug)).toEqual(['shoes', 'tops']);
  });
});
