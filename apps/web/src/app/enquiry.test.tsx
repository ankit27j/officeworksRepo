import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, receivedEnquiries } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

async function openEnquiryForProduct1() {
  const app = renderApp('/product/1');
  await app.user.click(await screen.findByRole('button', { name: 'Enquire' }));
  const dialog = await screen.findByRole('dialog', { name: 'Enquire about Mens Cotton Jacket' });
  return { ...app, dialog };
}

type User = ReturnType<typeof renderApp>['user'];

/**
 * Fills a field in one input event (like autofill or paste). Typing key-by-key re-renders the whole
 * Ant Design form per character, which takes ~0.7s per key in jsdom and made these tests time out.
 */
async function fill(user: User, field: HTMLElement, value: string) {
  await user.click(field);
  await user.paste(value);
}

async function fillValidForm(user: User, dialog: HTMLElement) {
  await fill(user, within(dialog).getByLabelText('Name'), 'Jane Citizen');
  await fill(user, within(dialog).getByLabelText('Email'), 'jane@example.com');
  await fill(user, within(dialog).getByLabelText(/Phone/), '0400 000 000');
}

describe('Acceptance criteria: Enquiry', () => {
  it(
    'GIVEN I am viewing a product, WHEN I click Enquire, complete the form and submit, ' +
      'THEN the enquiry is sent AND I see a "Thank you" message',
    async () => {
      const { user, dialog } = await openEnquiryForProduct1();

      // The message is pre-filled with the product.
      expect(within(dialog).getByLabelText('Message')).toHaveValue("I'm interested in Mens Cotton Jacket.");

      await fillValidForm(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }));

      expect(await screen.findByText('Thank you, Jane Citizen!')).toBeInTheDocument();
      expect(
        screen.getByText(
          "We've received your enquiry about Mens Cotton Jacket. Our sales team will be in touch at jane@example.com.",
        ),
      ).toBeInTheDocument();

      // What reached the API: the product id is attached, and the honeypot is empty.
      expect(receivedEnquiries).toEqual([
        {
          productId: '1',
          name: 'Jane Citizen',
          email: 'jane@example.com',
          phone: '0400 000 000',
          message: "I'm interested in Mens Cotton Jacket.",
        },
      ]);
    },
  );
});

describe('Enquiry form behaviour', () => {
  it('validates with the shared contract rules and sends nothing while invalid', async () => {
    const { user, dialog } = await openEnquiryForProduct1();

    await fill(user, within(dialog).getByLabelText('Email'), 'not-an-email');
    await user.clear(within(dialog).getByLabelText('Message'));
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }));

    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a valid email address')).toBeInTheDocument();
    expect(within(dialog).getByText('Message is required')).toBeInTheDocument();
    expect(receivedEnquiries).toEqual([]);
  });

  it('shows the API error and keeps what was typed (e.g. rate limited)', async () => {
    server.use(
      http.post('*/api/v1/enquiries', () =>
        HttpResponse.json(
          errorBody('RATE_LIMITED', 'Too many enquiries. Please wait a minute and try again.'),
          {
            status: 429,
          },
        ),
      ),
    );
    const { user, dialog } = await openEnquiryForProduct1();

    await fillValidForm(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }));

    expect(
      await within(dialog).findByText('Too many enquiries. Please wait a minute and try again.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Jane Citizen');
    expect(screen.queryByText(/Thank you/)).not.toBeInTheDocument();
  });

  it('shows API field errors under the matching field', async () => {
    server.use(
      http.post('*/api/v1/enquiries', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: [{ path: 'email', message: 'Email domain not accepted' }],
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user, dialog } = await openEnquiryForProduct1();

    await fillValidForm(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }));

    expect(await within(dialog).findByText('Email domain not accepted')).toBeInTheDocument();
    expect(within(dialog).getByText('Please fix the highlighted fields.')).toBeInTheDocument();
  });

  it('starts fresh when opened again after sending', async () => {
    const { user, dialog } = await openEnquiryForProduct1();
    await fillValidForm(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }));
    await user.click(await screen.findByRole('button', { name: 'Done' }));

    await user.click(screen.getByRole('button', { name: 'Enquire' }));

    const reopened = await screen.findByRole('dialog', { name: 'Enquire about Mens Cotton Jacket' });
    expect(within(reopened).getByLabelText('Name')).toHaveValue('');
  });

  it('includes a honeypot that is hidden from people and assistive tech', async () => {
    const { dialog } = await openEnquiryForProduct1();

    const honeypot = dialog.querySelector('input#website');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(within(dialog).queryByRole('textbox', { name: 'Website' })).not.toBeInTheDocument();
  });
});
