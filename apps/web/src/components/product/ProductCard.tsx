import type { Product } from '@catalogue/contracts';
import { Card, Flex, Typography } from 'antd';
import { Link } from 'react-router';
import { paths } from '../../config/paths';
import { Price } from './Price';
import { Rating } from './Rating';
import styles from './ProductCard.module.css';

/** A product tile. The whole tile is one link to the product page. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={paths.product(product.id)} className={styles.link}>
      <Card
        hoverable
        cover={
          <div className={styles.media}>
            <img src={product.imageUrl} alt={product.title} loading="lazy" className={styles.image} />
          </div>
        }
      >
        <Flex vertical gap="small">
          <Typography.Text type="secondary">{product.category.name}</Typography.Text>
          <Typography.Text strong ellipsis={{ tooltip: product.title }}>
            {product.title}
          </Typography.Text>
          <Flex justify="space-between" align="center" wrap gap="small">
            <Price price={product.price} />
            <Rating rating={product.rating} compact />
          </Flex>
        </Flex>
      </Card>
    </Link>
  );
}
