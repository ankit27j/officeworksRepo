import type { Product } from '@catalogue/contracts';
import { escapeHtml, toSingleLine } from '../../../common/utils/html';
import type { EnquiryRecord } from '../ports/enquiry.repository.port';

export interface SalesEnquiryEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * The email the sales inbox receives. Every customer-supplied value is HTML-escaped (html) or
 * flattened to one line (subject), so an enquiry can't inject markup or headers.
 */
export function buildSalesEnquiryEmail(enquiry: EnquiryRecord, product: Product): SalesEnquiryEmail {
  const price = `${product.price.currency} ${product.price.amount.toFixed(2)}`;
  const fields: [label: string, value: string][] = [
    ['Product', `${product.title} (id ${product.id})`],
    ['Price', price],
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone ?? 'Not provided'],
    ['Enquiry id', enquiry.id],
    ['Received', enquiry.createdAt.toISOString()],
  ];

  const text = [
    'New product enquiry',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    enquiry.message,
    '',
    'Reply to this email to respond to the customer.',
  ].join('\n');

  const rows = fields
    .map(
      ([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const html = [
    '<h2>New product enquiry</h2>',
    `<table cellpadding="4">${rows}</table>`,
    '<h3>Message</h3>',
    `<p>${escapeHtml(enquiry.message).replace(/\r?\n/g, '<br>')}</p>`,
    '<p>Reply to this email to respond to the customer.</p>',
  ].join('\n');

  return { subject: `New enquiry: ${toSingleLine(product.title)}`, text, html };
}
