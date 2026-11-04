import { describe, expect, it } from 'vitest';
import { SEARCH_TERM_MAX_LENGTH, SearchQuerySchema } from './search';

describe('SearchQuerySchema', () => {
  it('trims the term', () => {
    expect(SearchQuerySchema.parse({ search: '  jacket ' }).search).toBe('jacket');
  });

  it.each([
    ['missing', {}],
    ['blank', { search: '   ' }],
    ['too long', { search: 'a'.repeat(SEARCH_TERM_MAX_LENGTH + 1) }],
  ])('rejects a %s term', (_label, input) => {
    expect(SearchQuerySchema.safeParse(input).success).toBe(false);
  });
});
