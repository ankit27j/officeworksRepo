import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type CreateEnquiry, CreateEnquirySchema, type EnquiryCreated } from '@catalogue/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { EnquiriesService } from './enquiries.service';

@Controller('enquiries')
@UseGuards(ThrottlerGuard)
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  /** POST /api/v1/enquiries → 201 { id, status: 'received' } */
  @Post()
  create(@Body(new ZodValidationPipe(CreateEnquirySchema)) body: CreateEnquiry): Promise<EnquiryCreated> {
    return this.enquiries.submit(body);
  }
}
