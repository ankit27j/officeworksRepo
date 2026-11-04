import { describe, expect, it } from 'vitest';
import { CreateEnquirySchema, ENQUIRY_LIMITS } from './enquiry';

const valid = {
  productId: '1',
  name: '  Jane Citizen ',
  email: ' jane@example.com ',
  message: 'Is this available in blue?',
};

describe('CreateEnquirySchema', () => {
  it('accepts a minimal enquiry and trims input', () => {
    const result = CreateEnquirySchema.parse(valid);
    expect(result.name).toBe('Jane Citizen');
    expect(result.email).toBe('jane@example.com');
    expect(result.phone).toBeUndefined();
  });

  it('normalises an empty phone from a form field to undefined', () => {
    expect(CreateEnquirySchema.parse({ ...valid, phone: '   ' }).phone).toBeUndefined();
  });

  it('accepts a formatted phone number', () => {
    expect(CreateEnquirySchema.parse({ ...valid, phone: '+61 (02) 9999-0000' }).phone).toBe(
      '+61 (02) 9999-0000',
    );
  });

  it.each([
    ['missing name', { ...valid, name: '   ' }, 'name'],
    ['invalid email', { ...valid, email: 'not-an-email' }, 'email'],
    ['invalid phone', { ...valid, phone: 'call me' }, 'phone'],
    ['empty message', { ...valid, message: '' }, 'message'],
    ['message too long', { ...valid, message: 'x'.repeat(ENQUIRY_LIMITS.messageMax + 1) }, 'message'],
    ['missing product', { ...valid, productId: '' }, 'productId'],
  ])('rejects %s', (_label, input, field) => {
    const result = CreateEnquirySchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field);
  });
});
