import { describe, expect, it } from 'vitest';
import { formatPrice, pluralize } from './format';

describe('formatPrice', () => {
  it('formats AUD for en-AU', () => {
    expect(formatPrice({ amount: 55.99, currency: 'AUD' })).toBe('$55.99');
    expect(formatPrice({ amount: 1000, currency: 'AUD' })).toBe('$1,000.00');
  });
});

describe('pluralize', () => {
  it('handles one and many', () => {
    expect(pluralize(1, 'product')).toBe('1 product');
    expect(pluralize(3, 'product')).toBe('3 products');
  });
});
