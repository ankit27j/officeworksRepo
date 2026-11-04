import { Injectable } from '@nestjs/common';
import { EnquiryStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { type EnquiryRecord, EnquiryRepository, type NewEnquiry } from '../ports/enquiry.repository.port';

const MAX_ERROR_LENGTH = 1000;

@Injectable()
export class PrismaEnquiryRepository extends EnquiryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async create(enquiry: NewEnquiry): Promise<EnquiryRecord> {
    const row = await this.prisma.enquiry.create({
      data: { ...enquiry, phone: enquiry.phone ?? null },
    });
    return {
      id: row.id,
      productId: row.productId,
      productTitle: row.productTitle,
      name: row.name,
      email: row.email,
      phone: row.phone ?? undefined,
      message: row.message,
      createdAt: row.createdAt,
    };
  }

  override async markEmailed(id: string): Promise<void> {
    await this.prisma.enquiry.update({
      where: { id },
      data: { status: EnquiryStatus.EMAILED, emailError: null },
    });
  }

  override async markEmailFailed(id: string, reason: string): Promise<void> {
    await this.prisma.enquiry.update({
      where: { id },
      data: { status: EnquiryStatus.EMAIL_FAILED, emailError: reason.slice(0, MAX_ERROR_LENGTH) },
    });
  }
}
