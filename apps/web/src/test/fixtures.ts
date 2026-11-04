import type { Category, Product } from '@catalogue/contracts';

const product = (
  id: string,
  title: string,
  category: Category,
  amount: number,
  average: number,
  description = `${title} description`,
): Product => ({
  id,
  title,
  description,
  price: { amount, currency: 'AUD' },
  imageUrl: `https://images.test/${id}.png`,
  category,
  rating: { average, count: 100 },
});

export const ELECTRONICS: Category = { slug: 'electronics', name: 'Electronics' };
export const CLOTHING: Category = { slug: 'mens-clothing', name: "Men's Clothing" };
export const CATEGORIES: Category[] = [ELECTRONICS, CLOTHING];

export const PRODUCTS: Product[] = [
  product('1', 'Mens Cotton Jacket', CLOTHING, 55.99, 4.7, 'Warm outerwear for spring and autumn'),
  product('2', 'Slim Fit T-Shirt', CLOTHING, 22.3, 4.1),
  product('3', 'Casual Shirt', CLOTHING, 15.99, 2.1, 'Pairs well with a jacket'),
  product('4', 'Portable Hard Drive', ELECTRONICS, 64, 3.3),
  product('5', 'Gaming Monitor', ELECTRONICS, 999.99, 2.2),
  product('6', 'Internal SSD', ELECTRONICS, 109, 4.8),
];

/** The 5 products the business has chosen for the home page. */
export const FEATURED: Product[] = ['6', '1', '2', '4', '3'].map(
  (id) => PRODUCTS.find((p) => p.id === id) as Product,
);
