import type { Money } from '@catalogue/contracts';
import { APP_CONFIG } from '../config/app';

const currencyFormatters = new Map<string, Intl.NumberFormat>();

/** { amount: 55.99, currency: 'AUD' } -> "$55.99" (en-AU). */
export function formatPrice({ amount, currency }: Money): string {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(APP_CONFIG.locale, { style: 'currency', currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
