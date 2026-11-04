import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateEnquiry, EnquiryCreated, Product } from '@catalogue/contracts';
import { NotFoundError } from '../../common/errors/app-errors';
import type { Env } from '../../config/env.schema';
import { ProductSource } from '../products/ports/product-source.port';
import { type EnquiryRecord, EnquiryRepository } from './ports/enquiry.repository.port';
import { Mailer } from './ports/mailer.port';
import { buildSalesEnquiryEmail } from './templates/sales-enquiry.email';

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);
  private readonly salesInbox: string;

  constructor(
    private readonly products: ProductSource,
    private readonly enquiries: EnquiryRepository,
    private readonly mailer: Mailer,
    config: ConfigService<Env, true>,
  ) {
    this.salesInbox = config.get('SALES_INBOX_EMAIL', { infer: true });
  }

  /**
   * 1. Honeypot filled → looks like success to the bot, nothing is stored or sent.
   * 2. Product must exist; its title is saved with the enquiry.
   * 3. Save first, so a failed email never loses a lead.
   * 4. Email the sales inbox and record the outcome. The customer gets the same response either
   *    way: their enquiry is safe, and an EMAIL_FAILED status shows sales what to follow up.
   */
  async submit(input: CreateEnquiry): Promise<EnquiryCreated> {
    if (input.website) {
      this.logger.warn('Honeypot field filled; enquiry discarded');
      return { id: randomUUID(), status: 'received' };
    }

    const product = await this.products.getProduct(input.productId);
    if (!product) throw new NotFoundError('Product not found');

    const enquiry = await this.enquiries.create({
      productId: product.id,
      productTitle: product.title,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
    });

    await this.notifySales(enquiry, product);
    return { id: enquiry.id, status: 'received' };
  }

  private async notifySales(enquiry: EnquiryRecord, product: Product): Promise<void> {
    try {
      await this.mailer.send({
        to: this.salesInbox,
        replyTo: enquiry.email,
        ...buildSalesEnquiryEmail(enquiry, product),
      });
    } catch (error) {
      this.logger.error(`Sales email failed for enquiry ${enquiry.id}`, describeError(error));
      await this.recordStatus(enquiry.id, () =>
        this.enquiries.markEmailFailed(enquiry.id, describeError(error)),
      );
      return;
    }
    await this.recordStatus(enquiry.id, () => this.enquiries.markEmailed(enquiry.id));
  }

  /** The enquiry is already saved; failing to update its status must not fail the request. */
  private async recordStatus(id: string, update: () => Promise<void>): Promise<void> {
    try {
      await update();
    } catch (error) {
      this.logger.error(`Could not update status of enquiry ${id}`, describeError(error));
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
