import type { Product } from '@catalogue/contracts';

/**
 * Small offline catalogue for tests, demos and when Fake Store is down (PRODUCT_SOURCE=fixture).
 * Ids line up with Fake Store so the seeded featured picks still resolve.
 */
export const FIXTURE_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Fjallraven Foldsack No. 1 Backpack',
    description: 'Everyday backpack that fits a 15 inch laptop in a padded sleeve.',
    price: { amount: 109.95, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png',
    category: { slug: 'mens-clothing', name: "Men's Clothing" },
    rating: { average: 3.9, count: 120 },
  },
  {
    id: '3',
    title: 'Mens Cotton Jacket',
    description: 'Lightweight cotton outerwear for spring, autumn and camping trips.',
    price: { amount: 55.99, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png',
    category: { slug: 'mens-clothing', name: "Men's Clothing" },
    rating: { average: 4.7, count: 500 },
  },
  {
    id: '4',
    title: 'Mens Casual Slim Fit',
    description: 'Slim fit long sleeve shirt. Colour may vary slightly from the photo.',
    price: { amount: 15.99, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_t.png',
    category: { slug: 'mens-clothing', name: "Men's Clothing" },
    rating: { average: 2.1, count: 430 },
  },
  {
    id: '5',
    title: "John Hardy Women's Legends Naga Bracelet",
    description: 'Gold and silver dragon station chain bracelet inspired by the mythical water dragon.',
    price: { amount: 695, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/71pWzhdJNwL._AC_UL640_QL65_ML3_t.png',
    category: { slug: 'jewelery', name: 'Jewelery' },
    rating: { average: 4.6, count: 400 },
  },
  {
    id: '8',
    title: 'Pierced Owl Rose Gold Plated Earrings',
    description: 'Double flared tunnel plug earrings in rose gold plated stainless steel.',
    price: { amount: 10.99, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/51UDEzMJVpL._AC_UL640_QL65_ML3_t.png',
    category: { slug: 'jewelery', name: 'Jewelery' },
    rating: { average: 1.9, count: 100 },
  },
  {
    id: '11',
    title: 'Silicon Power 256GB SSD',
    description: '3D NAND internal drive with SLC cache for faster boot and transfer speeds.',
    price: { amount: 109, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/71kWymZ+c+L._AC_SX679_t.png',
    category: { slug: 'electronics', name: 'Electronics' },
    rating: { average: 4.8, count: 319 },
  },
  {
    id: '12',
    title: 'WD 4TB Gaming Drive',
    description: 'Portable external hard drive that expands console storage in minutes.',
    price: { amount: 114, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/61mtL65D4cL._AC_SX679_t.png',
    category: { slug: 'electronics', name: 'Electronics' },
    rating: { average: 4.8, count: 400 },
  },
  {
    id: '14',
    title: 'Samsung 49-Inch Curved Gaming Monitor',
    description: '144Hz super ultrawide QLED monitor with a dual 27 inch screen side by side.',
    price: { amount: 999.99, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_t.png',
    category: { slug: 'electronics', name: 'Electronics' },
    rating: { average: 2.2, count: 140 },
  },
  {
    id: '18',
    title: "MBJ Women's Short Sleeve Boat Neck Top",
    description: 'Soft stretchy fabric with a relaxed fit for everyday wear.',
    price: { amount: 9.85, currency: 'AUD' },
    imageUrl: 'https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_t.png',
    category: { slug: 'womens-clothing', name: "Women's Clothing" },
    rating: { average: 4.7, count: 130 },
  },
];
