import type { Product } from '@catalogue/contracts';
import { Breadcrumb, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { paths } from '../../config/paths';
import { Price } from './Price';
import { Rating } from './Rating';
import styles from './ProductDetails.module.css';

interface ProductDetailsProps {
  product: Product;
  /** Calls to action, e.g. the Enquire button. */
  actions?: ReactNode;
}

export function ProductDetails({ product, actions }: ProductDetailsProps) {
  return (
    <article>
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <Link to={paths.home()}>Home</Link> },
          { title: <Link to={paths.category(product.category.slug)}>{product.category.name}</Link> },
          { title: product.title },
        ]}
      />
      <div className={styles.layout}>
        <div className={styles.media}>
          <img src={product.imageUrl} alt={product.title} className={styles.image} />
        </div>
        <Flex vertical gap="middle">
          <Typography.Title level={1}>{product.title}</Typography.Title>
          <Rating rating={product.rating} />
          <Price price={product.price} large />
          <Typography.Paragraph>{product.description}</Typography.Paragraph>
          {actions && <div>{actions}</div>}
        </Flex>
      </div>
    </article>
  );
}
