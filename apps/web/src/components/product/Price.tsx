import type { Money } from '@catalogue/contracts';
import { Typography } from 'antd';
import { formatPrice } from '../../utils/format';

export function Price({ price, large = false }: { price: Money; large?: boolean }) {
  return large ? (
    <Typography.Title level={3}>{formatPrice(price)}</Typography.Title>
  ) : (
    <Typography.Text strong>{formatPrice(price)}</Typography.Text>
  );
}
