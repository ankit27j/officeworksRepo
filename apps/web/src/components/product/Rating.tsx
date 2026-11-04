import { StarFilled } from '@ant-design/icons';
import type { Rating as RatingValue } from '@catalogue/contracts';
import { Flex, Rate, Typography } from 'antd';
import styles from './Rating.module.css';

interface RatingProps {
  rating: RatingValue;
  /** One star + number, for narrow places like product tiles. */
  compact?: boolean;
}

/** The visuals are decorative; the accessible label carries the actual numbers. */
export function Rating({ rating, compact = false }: RatingProps) {
  const label = `Rated ${rating.average} out of 5 from ${rating.count} reviews`;

  if (compact) {
    return (
      <Flex align="center" gap="small" role="img" aria-label={label} className={styles.nowrap}>
        <StarFilled aria-hidden className={styles.star} />
        <Typography.Text>{rating.average.toFixed(1)}</Typography.Text>
        <Typography.Text type="secondary">({rating.count})</Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex align="center" gap="small" role="img" aria-label={label}>
      <Rate disabled allowHalf value={Math.round(rating.average * 2) / 2} aria-hidden />
      <Typography.Text type="secondary">({rating.count})</Typography.Text>
    </Flex>
  );
}
