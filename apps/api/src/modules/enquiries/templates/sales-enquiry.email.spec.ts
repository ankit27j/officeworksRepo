import { aProduct } from '../../../../test/fakes/product.factory';
import type { EnquiryRecord } from '../ports/enquiry.repository.port';
import { buildSalesEnquiryEmail } from './sales-enquiry.email';

const product = aProduct({ id: '3', title: 'Mens Cotton Jacket', price: { amount: 55.9, currency: 'AUD' } });

const enquiry: EnquiryRecord = {
  id: 'enq-1',
  productId: '3',
  productTitle: 'Mens Cotton Jacket',
  name: 'Jane Citizen',
  email: 'jane@example.com',
  message: 'Is this available in blue?\nThanks',
  createdAt: new Date('2026-11-02T10:00:00.000Z'),
};

describe('buildSalesEnquiryEmail', () => {
  it('includes the product, customer details and message', () => {
    const email = buildSalesEnquiryEmail(enquiry, product);

    expect(email.subject).toBe('New enquiry: Mens Cotton Jacket');
    for (const part of [
      'Mens Cotton Jacket (id 3)',
      'AUD 55.90',
      'Jane Citizen',
      'jane@example.com',
      'enq-1',
    ]) {
      expect(email.text).toContain(part);
      expect(email.html).toContain(part);
    }
    expect(email.text).toContain('Phone: Not provided');
    expect(email.html).toContain('Is this available in blue?<br>Thanks');
  });

  it('escapes customer input in the HTML body', () => {
    const email = buildSalesEnquiryEmail(
      { ...enquiry, name: '<img src=x onerror=alert(1)>', message: '<script>alert("x")</script> & co' },
      product,
    );

    expect(email.html).not.toContain('<script>');
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co');
  });

  it('keeps the subject to one line', () => {
    const email = buildSalesEnquiryEmail(enquiry, { ...product, title: 'Jacket\r\nBcc: victim@example.com' });
    expect(email.subject).toBe('New enquiry: Jacket Bcc: victim@example.com');
    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});
