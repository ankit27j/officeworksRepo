import type { Product } from '@catalogue/contracts';
import { Empty, Typography } from 'antd';
import { type ReactNode, useId } from 'react';
import { ProductGrid } from './ProductGrid';
import styles from './ProductSection.module.css';

interface ProductSectionProps {
  title: string;
  products: readonly Product[];
  description?: ReactNode;
  emptyText?: string;
  /** 1 when the section is the page's main heading (e.g. the home page). */
  headingLevel?: 1 | 2;
}

/** A titled group of products. Labelled by its heading, so it reads as a named region. */
export function ProductSection({
  title,
  products,
  description,
  emptyText = 'No products to show.',
  headingLevel = 2,
}: ProductSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <Typography.Title level={headingLevel} id={headingId}>
        {title}
      </Typography.Title>
      {description && <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>}
      {products.length > 0 ? <ProductGrid products={products} /> : <Empty description={emptyText} />}
    </section>
  );
}
