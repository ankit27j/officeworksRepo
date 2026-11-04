import type { Product } from '@catalogue/contracts';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

/** Responsive grid of product tiles: as many columns as fit, down to one on phones. */
export function ProductGrid({ products }: { products: readonly Product[] }) {
  return (
    <ul className={styles.grid}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
