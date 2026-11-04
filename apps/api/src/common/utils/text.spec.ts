import { slugify, titleCase } from './text';

describe('slugify', () => {
  it.each([
    ["men's clothing", 'mens-clothing'],
    ['Women’s  Clothing', 'womens-clothing'],
    ['jewelery', 'jewelery'],
    ['  Home & Garden!  ', 'home-garden'],
    ['Café Décor', 'cafe-decor'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('titleCase', () => {
  it('capitalises each word without breaking apostrophes', () => {
    expect(titleCase("men's clothing")).toBe("Men's Clothing");
  });
});
